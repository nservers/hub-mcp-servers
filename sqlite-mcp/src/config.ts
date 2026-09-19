import { z } from 'zod';

const configSchema = z.object({
  dbPath: z.string().default(':memory:'),
  libsqlUrl: z.string().optional(),
  libsqlAuthToken: z.string().optional(),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  maxRows: z.coerce.number().int().positive().default(1000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const resolvedPath = process.env.SQLITE_DATABASE_PATH || ':memory:';
  return configSchema.parse({
    dbPath: resolvedPath,
    libsqlUrl: process.env.LIBSQL_URL || undefined,
    libsqlAuthToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    maxRows: process.env.MAX_ROWS ? Number(process.env.MAX_ROWS) : 1000,
  });
}
