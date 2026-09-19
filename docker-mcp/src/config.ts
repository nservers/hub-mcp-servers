import { z } from 'zod';

const configSchema = z.object({
  dockerHost: z.string().optional(),
  socketPath: z.string().optional(),
  tlsVerify: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    dockerHost: process.env.DOCKER_HOST || undefined,
    socketPath: process.env.DOCKER_SOCKET_PATH || undefined,
    tlsVerify: process.env.DOCKER_TLS_VERIFY,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
  });
}
