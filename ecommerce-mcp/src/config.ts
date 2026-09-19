import { z } from 'zod';

const configSchema = z.object({
  platform: z.enum(['woocommerce', 'shopify']).default('woocommerce'),
  storeUrl: z.string().default('https://demo.store.nservers.io'),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  shopifyToken: z.string().optional(),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  timeoutMs: z.coerce.number().int().positive().default(10000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  const rawPlatform = (process.env.STORE_PLATFORM || 'woocommerce').toLowerCase();
  return configSchema.parse({
    platform: rawPlatform === 'shopify' ? 'shopify' : 'woocommerce',
    storeUrl: process.env.STORE_URL || 'https://demo.store.nservers.io',
    apiKey: process.env.STORE_API_KEY || undefined,
    apiSecret: process.env.STORE_API_SECRET || undefined,
    shopifyToken: process.env.SHOPIFY_ACCESS_TOKEN || undefined,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    timeoutMs: process.env.REQUEST_TIMEOUT_MS ? Number(process.env.REQUEST_TIMEOUT_MS) : 10000,
  });
}
