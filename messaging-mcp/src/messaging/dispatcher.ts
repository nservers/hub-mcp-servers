import { AppConfig } from '../config.js';

export interface DispatchResult {
  destination: 'slack' | 'discord' | 'custom_webhook';
  delivered: boolean;
  status: number;
  simulated?: boolean;
  responseBody?: string;
  error?: string;
}

export class MessageDispatcher {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  private async postJson(url: string, body: any, customHeaders: Record<string, string> = {}): Promise<{ status: number; text: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'nServers-Messaging-MCP/1.0',
          ...customHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();
      return { status: response.status, text };
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendSlack(
    text: string,
    channel?: string,
    blocks?: any[],
    overrideUrl?: string
  ): Promise<DispatchResult> {
    const targetUrl = overrideUrl || this.config.slackWebhookUrl;
    if (!targetUrl) {
      return {
        destination: 'slack',
        delivered: true,
        status: 200,
        simulated: true,
        responseBody: 'Simulated dispatch (SLACK_WEBHOOK_URL not configured).',
      };
    }

    try {
      const payload: Record<string, any> = { text };
      if (channel) payload.channel = channel;
      if (blocks && Array.isArray(blocks)) payload.blocks = blocks;

      const { status, text: resText } = await this.postJson(targetUrl, payload);
      return {
        destination: 'slack',
        delivered: status >= 200 && status < 300,
        status,
        responseBody: resText,
      };
    } catch (error: any) {
      return {
        destination: 'slack',
        delivered: false,
        status: 500,
        error: error.message || String(error),
      };
    }
  }

  async sendDiscord(
    content: string,
    username?: string,
    embeds?: any[],
    overrideUrl?: string
  ): Promise<DispatchResult> {
    const targetUrl = overrideUrl || this.config.discordWebhookUrl;
    if (!targetUrl) {
      return {
        destination: 'discord',
        delivered: true,
        status: 200,
        simulated: true,
        responseBody: 'Simulated dispatch (DISCORD_WEBHOOK_URL not configured).',
      };
    }

    try {
      const payload: Record<string, any> = { content };
      if (username) payload.username = username;
      if (embeds && Array.isArray(embeds)) payload.embeds = embeds;

      const { status, text: resText } = await this.postJson(targetUrl, payload);
      return {
        destination: 'discord',
        delivered: status >= 200 && status < 300,
        status,
        responseBody: resText,
      };
    } catch (error: any) {
      return {
        destination: 'discord',
        delivered: false,
        status: 500,
        error: error.message || String(error),
      };
    }
  }

  async sendCustomWebhook(
    url: string,
    payload: any,
    headers: Record<string, string> = {},
    method: 'POST' | 'PUT' | 'PATCH' = 'POST'
  ): Promise<DispatchResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'nServers-Messaging-MCP/1.0',
          ...headers,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      return {
        destination: 'custom_webhook',
        delivered: response.status >= 200 && response.status < 300,
        status: response.status,
        responseBody: text,
      };
    } catch (error: any) {
      return {
        destination: 'custom_webhook',
        delivered: false,
        status: 500,
        error: error.message || String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  testConnectivity(): Record<string, any> {
    return {
      slackConfigured: Boolean(this.config.slackWebhookUrl),
      discordConfigured: Boolean(this.config.discordWebhookUrl),
      customWebhookConfigured: Boolean(this.config.customWebhookUrl),
      status: 'ready',
    };
  }
}
