import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config.js';
import { ScraperEngine } from './scraper/engine.js';
import { registerScraperTools } from './tools/register.js';

const config = loadConfig();
const app = express();
app.use(cors({ origin: '*' }));

const scraper = new ScraperEngine(config);
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
      message: 'Missing or invalid Bearer credentials for web-scraper-mcp instance.',
    });
    return;
  }

  next();
}

app.get(['/health', '/ping'], async (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'web-scraper-mcp',
    version: '1.0.0',
    userAgent: config.userAgent,
    timeoutMs: config.timeoutMs,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/sse', authenticate, async (req, res) => {
  console.log(`[web-scraper-mcp] Inbound SSE connection from ${req.ip}`);

  const server = new McpServer({
    name: 'nservers-web-scraper-mcp',
    version: '1.0.0',
  });

  registerScraperTools(server, scraper);

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[web-scraper-mcp] SSE connection closed for session ${sessionId}`);
    transports.delete(sessionId);
  });

  try {
    await server.connect(transport);
    console.log(`[web-scraper-mcp] McpServer connected to SSE transport (session: ${sessionId})`);
  } catch (error: any) {
    console.error(`[web-scraper-mcp] Failed to connect McpServer to SSE transport:`, error);
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
    console.error(`[web-scraper-mcp] Error handling JSON-RPC message:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal error processing JSON-RPC message.' });
    }
  }
});

const serverInstance = app.listen(config.portHttp, config.hostHttp, () => {
  console.log(
    `[web-scraper-mcp] Official nServers MCP server running at http://${config.hostHttp}:${config.portHttp}`
  );
  console.log(`[web-scraper-mcp] Bearer Authentication: ${config.authToken ? 'ENABLED' : 'DISABLED'}`);
});

async function shutdown() {
  console.log('[web-scraper-mcp] Shutting down gracefully...');
  serverInstance.close(() => {
    console.log('[web-scraper-mcp] Server closed. Exited.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
