import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config.js';
import { GitClientWrapper } from './git/client.js';
import { registerGitTools } from './tools/register.js';

const config = loadConfig();
const app = express();
app.use(cors({ origin: '*' }));

const git = new GitClientWrapper(config);
const transports = new Map<string, SSEServerTransport>();

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!config.authToken) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (queryToken) {
    token = queryToken.trim();
  }

  if (!token || !timingSafeCompare(token, config.authToken)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Bearer credentials for git-mcp instance.',
    });
    return;
  }

  next();
}

app.get(['/health', '/ping'], async (_req, res) => {
  const health = await git.testConnection();
  const statusCode = health.ok ? 200 : 503;
  res.status(statusCode).json({
    status: health.ok ? 'healthy' : 'degraded',
    service: 'git-mcp',
    version: '1.0.0',
    repoPath: config.repoPath,
    isRepo: health.isRepo,
    latencyMs: health.latencyMs,
    error: health.error,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/sse', authenticate, async (req, res) => {
  console.log(`[git-mcp] Inbound SSE connection from ${req.ip}`);

  const server = new McpServer({
    name: 'nservers-git-mcp',
    version: '1.0.0',
  });

  registerGitTools(server, git);

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[git-mcp] SSE connection closed for session ${sessionId}`);
    transports.delete(sessionId);
  });

  try {
    await server.connect(transport);
    console.log(`[git-mcp] McpServer connected to SSE transport (session: ${sessionId})`);
  } catch (error: any) {
    console.error(`[git-mcp] Failed to connect McpServer to SSE transport:`, error);
    transports.delete(sessionId);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP server connection failed.' });
    }
  }
});

app.post('/messages', authenticate, express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing required query parameter: sessionId.' });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: `Session '${sessionId}' not found or disconnected.` });
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error: any) {
    console.error(`[git-mcp] Error handling JSON-RPC message:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error processing JSON-RPC message.' });
    }
  }
});

const serverInstance = app.listen(config.portHttp, config.hostHttp, () => {
  console.log(
    `[git-mcp] Official nServers MCP server running at http://${config.hostHttp}:${config.portHttp}`
  );
  console.log(`[git-mcp] Target Repository: ${config.repoPath}`);
  console.log(`[git-mcp] Bearer Authentication: ${config.authToken ? 'ENABLED' : 'DISABLED'}`);
});

async function shutdown() {
  console.log('[git-mcp] Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('[git-mcp] Server closed. Exited.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
