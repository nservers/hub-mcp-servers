import { z } from 'zod';

const configSchema = z.object({
  slackWebhookUrl: z.string().url().optional(),
  discordWebhookUrl: z.string().url().optional(),
  customWebhookUrl: z.string().url().optional(),
  authToken: z.string().optional(),
  portHttp: z.coerce.number().int().positive().default(3000),
  hostHttp: z.string().default('0.0.0.0'),
  timeoutMs: z.coerce.number().int().positive().default(10000),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse({
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || undefined,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || undefined,
    customWebhookUrl: process.env.CUSTOM_WEBHOOK_URL || undefined,
    authToken: process.env.MCP_AUTH_TOKEN || process.env.AUTH_TOKEN,
    portHttp: process.env.PORT ? Number(process.env.PORT) : 3000,
    hostHttp: process.env.HOST || '0.0.0.0',
    timeoutMs: process.env.REQUEST_TIMEOUT_MS ? Number(process.env.REQUEST_TIMEOUT_MS) : 10000,
  });
}
