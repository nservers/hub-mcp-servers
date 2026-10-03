import { z } from 'zod';

const configSchema = z.object({
  apiUrl: z.string().url().default('https://api.nservers.io'),
  organizationId: z.string().optional(),
  mcpAuthToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  timeoutMs: z.coerce.number().int().positive().default(15000),
  maxCallsPerHour: z.coerce.number().int().positive().default(500),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    apiUrl: process.env.NSERVERS_API_URL || 'https://api.nservers.io',
    organizationId: process.env.ORGANIZATION_ID || undefined,
    mcpAuthToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    timeoutMs: process.env.REQUEST_TIMEOUT_MS ? Number(process.env.REQUEST_TIMEOUT_MS) : 15000,
    maxCallsPerHour: process.env.MAX_CALLS_PER_HOUR ? Number(process.env.MAX_CALLS_PER_HOUR) : 500,
  });
}
