import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MessageDispatcher } from '../messaging/dispatcher.js';

export function registerMessagingTools(server: McpServer, dispatcher: MessageDispatcher): void {
  server.tool(
    'send_slack_message',
    'Dispatch a structured alert or notification message to Slack via Incoming Webhook, supporting markdown text and Block Kit structures.',
    {
      text: z
        .string()
        .min(1)
        .describe('Primary plain-text or markdown notification body'),
      channel: z
        .string()
        .optional()
        .describe('Target channel override (e.g. "#devops-alerts")'),
      webhookUrl: z
        .string()
        .url()
        .optional()
        .describe('Custom Slack Incoming Webhook URL override'),
    },
    async ({ text, channel, webhookUrl }) => {
      try {
        const result = await dispatcher.sendSlack(text, channel, undefined, webhookUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to dispatch Slack message: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'send_discord_message',
    'Dispatch an alert or rich embed notification to a Discord channel via Webhook.',
    {
      content: z
        .string()
        .min(1)
        .describe('Message body text (up to 2000 characters)'),
      username: z
        .string()
        .optional()
        .describe('Bot display name override'),
      webhookUrl: z
        .string()
        .url()
        .optional()
        .describe('Custom Discord Webhook URL override'),
    },
    async ({ content, username, webhookUrl }) => {
      try {
        const result = await dispatcher.sendDiscord(content, username, undefined, webhookUrl);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to dispatch Discord message: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'send_webhook',
    'Send an arbitrary JSON HTTP payload to a third-party webhook endpoint with custom headers.',
    {
      url: z
        .string()
        .url()
        .describe('Target webhook HTTP/HTTPS endpoint'),
      payload: z
        .record(z.any())
        .describe('Structured JSON object payload to transmit'),
      headers: z
        .record(z.string())
        .optional()
        .default({})
        .describe('Custom HTTP headers to include (e.g. Authorization or X-Signature)'),
      method: z
        .enum(['POST', 'PUT', 'PATCH'])
        .default('POST')
        .describe('HTTP verb (default: POST)'),
    },
    async ({ url, payload, headers, method }) => {
      try {
        const result = await dispatcher.sendCustomWebhook(url, payload, headers, method);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Webhook transmission failed: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'test_connectivity',
    'Inspect configured webhook endpoints and verify transport readiness.',
    {},
    async () => {
      try {
        const status = dispatcher.testConnectivity();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Connectivity test failed: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
