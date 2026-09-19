import { z } from 'zod';

const configSchema = z.object({
  connection: z.enum(['pgsql', 'mysql', 'postgres', 'mariadb']).default('pgsql').transform((val) => {
    if (val === 'postgres') return 'pgsql';
    if (val === 'mariadb') return 'mysql';
    return val as 'pgsql' | 'mysql';
  }),
  host: z.string().min(1).default('127.0.0.1'),
  port: z.coerce.number().int().positive().default(5432),
  database: z.string().min(1).default('postgres'),
  username: z.string().min(1).default('postgres'),
  password: z.string().default(''),
  ssl: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1' || val === 'require'),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  maxRows: z.coerce.number().int().positive().default(1000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const rawConnection = process.env.DB_CONNECTION || 'pgsql';
  const defaultPort = rawConnection.includes('mysql') || rawConnection.includes('mariadb') ? 3306 : 5432;
  const defaultUser = rawConnection.includes('mysql') || rawConnection.includes('mariadb') ? 'root' : 'postgres';
  const defaultDb = rawConnection.includes('mysql') || rawConnection.includes('mariadb') ? 'mysql' : 'postgres';

  return configSchema.parse({
    connection: process.env.DB_CONNECTION,
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : defaultPort,
    database: process.env.DB_DATABASE || defaultDb,
    username: process.env.DB_USERNAME || defaultUser,
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    maxRows: process.env.MAX_ROWS ? Number(process.env.MAX_ROWS) : 1000,
  });
}
