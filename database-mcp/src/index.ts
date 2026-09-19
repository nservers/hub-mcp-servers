import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { loadConfig } from './config.js';
import { DatabaseClient } from './db/client.js';
import { registerDatabaseTools } from './tools/register.js';

const config = loadConfig();
const app = express();
app.use(cors({ origin: '*' }));

const db = new DatabaseClient(config);

// Mapa de sessões ativas do transporte SSE
const transports = new Map<string, SSEServerTransport>();

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

  if (!token || token !== config.authToken) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Credencial Bearer ausente ou inválida para esta instância do database-mcp.',
    });
    return;
  }

  next();
}

// 1. Healthcheck e Ping públicos (para Traefik, Coolify e diagnóstico no painel)
app.get(['/health', '/ping'], async (_req, res) => {
  const dbHealth = await db.testConnection();
  const statusCode = dbHealth.ok ? 200 : 503;
  res.status(statusCode).json({
    status: dbHealth.ok ? 'healthy' : 'degraded',
    service: 'database-mcp',
    version: '1.0.0',
    connection: config.connection,
    host: config.host,
    database: config.database,
    dbLatencyMs: dbHealth.latencyMs,
    dbError: dbHealth.error,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 2. Endpoint SSE (Server-Sent Events) com autenticação Bearer
app.get('/sse', authenticate, async (req, res) => {
  console.log(`[database-mcp] Nova conexão SSE recebida de ${req.ip}`);

  const server = new McpServer({
    name: 'nservers-database-mcp',
    version: '1.0.0',
  });

  registerDatabaseTools(server, db);

  const transport = new SSEServerTransport('/messages', res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[database-mcp] Conexão SSE encerrada para sessão ${sessionId}`);
    transports.delete(sessionId);
  });

  try {
    await server.connect(transport);
    console.log(`[database-mcp] McpServer conectado ao transporte SSE (sessão: ${sessionId})`);
  } catch (error: any) {
    console.error(`[database-mcp] Falha ao conectar McpServer ao transporte SSE:`, error);
    transports.delete(sessionId);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Falha na conexão do servidor MCP.' });
    }
  }
});

// 3. Endpoint de Mensagens JSON-RPC (POST /messages)
app.post('/messages', authenticate, express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    res.status(400).json({ error: 'Parâmetro sessionId é obrigatório na query string.' });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: `Sessão '${sessionId}' não encontrada ou desconectada.` });
    return;
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error: any) {
    console.error(`[database-mcp] Erro ao processar mensagem JSON-RPC:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro interno ao processar mensagem JSON-RPC.' });
    }
  }
});

const serverInstance = app.listen(config.portHttp, config.hostHttp, () => {
  console.log(
    `[database-mcp] Servidor oficial nServers MCP iniciado em http://${config.hostHttp}:${config.portHttp}`
  );
  console.log(`[database-mcp] Driver: ${config.connection} | Banco: ${config.database}@${config.host}:${config.port}`);
  console.log(`[database-mcp] Autenticação Bearer: ${config.authToken ? 'ATIVADA' : 'DESATIVADA'}`);
});

// Encerramento limpo (Graceful Shutdown)
async function shutdown() {
  console.log('[database-mcp] Encerrando serviços graciosamente...');
  serverInstance.close(async () => {
    await db.close();
    console.log('[database-mcp] Conexões fechadas. Encerrado.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
