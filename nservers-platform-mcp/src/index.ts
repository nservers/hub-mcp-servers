import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config.js';
import { ApiError, PlatformClient, SessionContext } from './platform/client.js';
import { registerReadTools } from './tools/read.js';
import { registerWriteTools } from './tools/write.js';

const config = loadConfig();
const app = express();
app.use(cors({ origin: '*' }));

interface ActiveSession {
  transport: SSEServerTransport;
  context: SessionContext;
}

const sessions = new Map<string, ActiveSession>();

function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function extractPat(req: express.Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }
  const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  return queryToken || undefined;
}

function gateCheck(req: express.Request, res: express.Response): boolean {
  if (!config.mcpAuthToken) return true;
  const headerKey = req.headers['x-mcp-auth'];
  const queryKey = typeof req.query.mcp_key === 'string' ? req.query.mcp_key : '';
  const provided = (typeof headerKey === 'string' ? headerKey : '') || queryKey;
  if (provided && timingSafeCompare(provided, config.mcpAuthToken)) return true;
  res.status(401).json({
    error: 'Unauthorized',
    message: 'Missing or invalid MCP gateway key (X-MCP-Auth header).',
  });
  return false;
}

app.get(['/health', '/ping'], async (_req, res) => {
  const probe = new PlatformClient(config, {
    pat: '',
    abilities: [],
    userLabel: 'healthcheck',
    callsThisHour: 0,
    windowStartedAt: Date.now(),
  });
  const health = await probe.testConnection();
  res.status(health.ok ? 200 : 503).json({
    status: health.ok ? 'healthy' : 'degraded',
    service: 'nservers-platform-mcp',
    version: '1.0.0',
    apiUrl: config.apiUrl,
    latencyMs: health.latencyMs,
    error: health.error,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/sse', async (req, res) => {
  if (!gateCheck(req, res)) return;

  const pat = extractPat(req);
  if (!pat) {
    res.status(401).json({
      error: 'Unauthorized',
      message:
        'An nServers personal access token is required: Authorization: Bearer <pat>. ' +
        'Create one at https://nservers.app (tokens page) with the abilities you want to expose.',
    });
    return;
  }

  const context: SessionContext = {
    pat,
    abilities: [],
    userLabel: 'unknown',
    callsThisHour: 0,
    windowStartedAt: Date.now(),
  };
  const client = new PlatformClient(config, context);

  try {
    const me = await client.me();
    console.log(
      `[nservers-platform-mcp] SSE connect from ${req.ip} as ${me.userLabel} ` +
        `(${me.abilities.length} abilities)`
    );
  } catch (error) {
    const status = error instanceof ApiError && error.kind === 'unauthorized' ? 401 : 403;
    res.status(status).json({
      error: 'Unauthorized',
      message:
        'The personal access token could not be validated against the nServers API.',
    });
    return;
  }

  const server = new McpServer({
    name: 'nservers-platform-mcp',
    version: '1.0.0',
  });
  registerReadTools(server, client);
  registerWriteTools(server, client);

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  sessions.set(sessionId, { transport, context });

  req.on('close', () => {
    console.log(`[nservers-platform-mcp] SSE closed for session ${sessionId}`);
    sessions.delete(sessionId);
  });

  try {
    await server.connect(transport);
  } catch (error) {
    console.error('[nservers-platform-mcp] Failed to connect transport:', error);
    sessions.delete(sessionId);
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP server connection failed.' });
    }
  }
});

app.post('/messages', express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: 'Missing required query parameter: sessionId.' });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: `Session '${sessionId}' not found or disconnected.` });
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error('[nservers-platform-mcp] Error handling JSON-RPC message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error processing JSON-RPC message.' });
    }
  }
});

const serverInstance = app.listen(config.portHttp, config.hostHttp, () => {
  console.log(
    `[nservers-platform-mcp] Official nServers control-plane MCP running at ` +
      `http://${config.hostHttp}:${config.portHttp}`
  );
  console.log(`[nservers-platform-mcp] Target API: ${config.apiUrl}`);
  console.log(
    `[nservers-platform-mcp] Gateway key: ${config.mcpAuthToken ? 'ENABLED (X-MCP-Auth)' : 'DISABLED'}`
  );
  console.log(`[nservers-platform-mcp] Tool-call budget: ${config.maxCallsPerHour}/h per session`);
});

async function shutdown() {
  console.log('[nservers-platform-mcp] Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('[nservers-platform-mcp] Server closed. Exited.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
