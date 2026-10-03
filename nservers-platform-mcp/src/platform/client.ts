import crypto from 'node:crypto';
import { AppConfig } from '../config.js';

export type ApiErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'approval_required'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'validation'
  | 'upstream'
  | 'network';

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    message: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SessionContext {
  pat: string;
  abilities: string[];
  userLabel: string;
  callsThisHour: number;
  windowStartedAt: number;
}

const STEP_UP_PATTERN = /step[\s-]?up/i;

export class PlatformClient {
  constructor(
    private readonly config: AppConfig,
    private readonly session: SessionContext
  ) {}

  get abilities(): readonly string[] {
    return this.session.abilities;
  }

  get remainingCalls(): number {
    this.rollWindow();
    return Math.max(0, this.config.maxCallsPerHour - this.session.callsThisHour);
  }

  private rollWindow(): void {
    if (Date.now() - this.session.windowStartedAt >= 3_600_000) {
      this.session.callsThisHour = 0;
      this.session.windowStartedAt = Date.now();
    }
  }

  consumeCall(): void {
    this.rollWindow();
    this.session.callsThisHour += 1;
    if (this.session.callsThisHour > this.config.maxCallsPerHour) {
      throw new ApiError(
        'rate_limited',
        `Hourly MCP tool-call budget exhausted (${this.config.maxCallsPerHour}/h). Wait for the window to reset or raise MAX_CALLS_PER_HOUR.`
      );
    }
  }

  async me(): Promise<{ abilities: string[]; userLabel: string }> {
    const data = await this.fetchApi('/api/v1/me', { skipBudget: true });
    const abilities: string[] =
      data?.abilities ?? data?.data?.abilities ?? data?.user?.abilities ?? [];
    const userLabel =
      data?.user?.email ?? data?.data?.user?.email ?? data?.email ?? 'unknown';
    this.session.abilities = abilities;
    this.session.userLabel = userLabel;
    return { abilities, userLabel };
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const res = await fetch(`${this.baseUrl()}/api/v1/health`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        return { ok: res.ok, latencyMs: Math.round(performance.now() - start) };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      return {
        ok: false,
        latencyMs: Math.round(performance.now() - start),
        error: error?.message || String(error),
      };
    }
  }

  private baseUrl(): string {
    return this.config.apiUrl.replace(/\/$/, '');
  }

  async fetchApi(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      stepUpToken?: string;
      skipBudget?: boolean;
    } = {}
  ): Promise<any> {
    if (!options.skipBudget) {
      this.consumeCall();
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.session.pat}`,
      'X-MCP-Tool-Source': 'nservers-platform-mcp',
      ...(this.config.organizationId
        ? { 'X-Organization-Id': this.config.organizationId }
        : {}),
    };

    const method = (options.method || 'GET').toUpperCase();
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (method !== 'GET' && method !== 'HEAD') {
      headers['Idempotency-Key'] = `mcp-${crypto.randomUUID()}`;
    }
    if (options.stepUpToken) {
      headers['X-Step-Up-Token'] = options.stepUpToken;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl()}${path}`, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
    } catch (error: any) {
      throw new ApiError(
        'network',
        `Failed to reach nServers API: ${error?.message || String(error)}`
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 204) {
      return { ok: true };
    }

    let payload: any = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }

    if (!response.ok) {
      throw classifyError(response.status, payload);
    }
    return payload;
  }
}

function extractMessage(payload: any, fallback: string): string {
  return (
    payload?.error?.message ??
    payload?.message ??
    payload?.error ??
    fallback
  );
}

function classifyError(status: number, payload: any): ApiError {
  const message = extractMessage(payload, `HTTP ${status}`);
  switch (status) {
    case 400:
      return new ApiError('validation', message, status, payload);
    case 401:
      return new ApiError(
        'unauthorized',
        'Personal access token rejected by the nServers API. Check that the PAT is valid and not revoked.',
        status,
        payload
      );
    case 403:
      if (STEP_UP_PATTERN.test(message)) {
        return new ApiError(
          'approval_required',
          'Human step-up verification required for this action. Generate a step-up token bound to this PAT (POST /api/v1/auth/step-up or the nServers app) and retry passing it as stepUpToken.',
          status,
          payload
        );
      }
      return new ApiError(
        'forbidden',
        `Forbidden by control-plane policy: ${message}`,
        status,
        payload
      );
    case 404:
      return new ApiError('not_found', message, status, payload);
    case 409:
      return new ApiError('conflict', message, status, payload);
    case 422:
      return new ApiError('validation', message, status, payload);
    case 429:
      return new ApiError('rate_limited', message, status, payload);
    default:
      return new ApiError('upstream', message, status, payload);
  }
}
