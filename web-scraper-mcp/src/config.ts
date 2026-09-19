import { z } from 'zod';

const configSchema = z.object({
  userAgent: z.string().default('nServers-Web-Scraper-MCP/1.0 (+https://nservers.io)'),
  timeoutMs: z.coerce.number().int().positive().default(15000),
  maxContentBytes: z.coerce.number().int().positive().default(2097152),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    userAgent: process.env.USER_AGENT || 'nServers-Web-Scraper-MCP/1.0 (+https://nservers.io)',
    timeoutMs: process.env.REQUEST_TIMEOUT_MS ? Number(process.env.REQUEST_TIMEOUT_MS) : 15000,
    maxContentBytes: process.env.MAX_CONTENT_BYTES ? Number(process.env.MAX_CONTENT_BYTES) : 2097152,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
  });
}
