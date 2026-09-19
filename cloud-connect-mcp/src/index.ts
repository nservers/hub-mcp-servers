import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config.js';
import { CloudConnectClient } from './cloud/client.js';
import { registerCloudConnectTools } from './tools/register.js';

const config = loadConfig();
const app = express();
app.use(cors({ origin: '*' }));

const cloud = new CloudConnectClient(config);
const transports = new Map<string, SSEServerTransport>();

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
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
      message: 'Missing or invalid Bearer credentials for cloud-connect-mcp instance.',
    });
    return;
  }

  next();
}

app.get(['/health', '/ping'], async (_req, res) => {
  const health = await cloud.testConnection();
  const statusCode = health.ok ? 200 : 503;
  res.status(statusCode).json({
    status: health.ok ? 'healthy' : 'degraded',
    service: 'cloud-connect-mcp',
    version: '1.0.0',
    apiUrl: config.apiUrl,
    latencyMs: health.latencyMs,
    error: health.error,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/sse', authenticate, async (req, res) => {
  console.log(`[cloud-connect-mcp] Inbound SSE connection from ${req.ip}`);

  const server = new McpServer({
    name: 'nservers-cloud-connect-mcp',
    version: '1.0.0',
  });

  registerCloudConnectTools(server, cloud);

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[cloud-connect-mcp] SSE connection closed for session ${sessionId}`);
    transports.delete(sessionId);
  });

  try {
    await server.connect(transport);
    console.log(`[cloud-connect-mcp] McpServer connected to SSE transport (session: ${sessionId})`);
  } catch (error: any) {
    console.error(`[cloud-connect-mcp] Failed to connect McpServer to SSE transport:`, error);
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
    console.error(`[cloud-connect-mcp] Error handling JSON-RPC message:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error processing JSON-RPC message.' });
    }
  }
});

const serverInstance = app.listen(config.portHttp, config.hostHttp, () => {
  console.log(
    `[cloud-connect-mcp] Official nServers MCP server running at http://${config.hostHttp}:${config.portHttp}`
  );
  console.log(`[cloud-connect-mcp] Target API: ${config.apiUrl}`);
  console.log(`[cloud-connect-mcp] Bearer Authentication: ${config.authToken ? 'ENABLED' : 'DISABLED'}`);
});

async function shutdown() {
  console.log('[cloud-connect-mcp] Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('[cloud-connect-mcp] Server closed. Exited.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
