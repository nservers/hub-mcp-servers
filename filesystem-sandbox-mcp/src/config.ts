import { z } from 'zod';
import path from 'node:path';

const configSchema = z.object({
  sandboxRoot: z.string().min(1),
  maxReadBytes: z.coerce.number().int().positive().default(1048576),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const defaultRoot = process.env.STORAGE_ROOT_PATH || process.env.SANDBOX_ROOT_PATH || path.resolve(process.cwd(), 'sandbox_data');
  return configSchema.parse({
    sandboxRoot: path.resolve(defaultRoot),
    maxReadBytes: process.env.MAX_READ_BYTES ? Number(process.env.MAX_READ_BYTES) : 1048576,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
  });
}
