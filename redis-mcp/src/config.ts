import { z } from 'zod';

const configSchema = z.object({
  host: z.string().min(1).default('127.0.0.1'),
  port: z.coerce.number().int().positive().default(6379),
  password: z.string().optional(),
  db: z.coerce.number().int().min(0).max(15).default(0),
  tls: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1'),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  maxScanCount: z.coerce.number().int().positive().default(500),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0,
    tls: process.env.REDIS_TLS,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    maxScanCount: process.env.MAX_SCAN_COUNT ? Number(process.env.MAX_SCAN_COUNT) : 500,
  });
}
