import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z.string().url().default('https://api.nservers.io'),
  apiToken: z.string().min(1).default('mock_token'),
  organizationId: z.string().optional(),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  timeoutMs: z.coerce.number().int().positive().default(10000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    apiUrl: process.env.NSERVERS_API_URL || 'https://api.nservers.io',
    apiToken: process.env.NSERVERS_API_TOKEN || 'mock_token',
    organizationId: process.env.ORGANIZATION_ID || undefined,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    timeoutMs: process.env.REQUEST_TIMEOUT_MS ? Number(process.env.REQUEST_TIMEOUT_MS) : 10000,
  });
}
