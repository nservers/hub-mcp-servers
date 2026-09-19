import { Redis, type RedisOptions } from 'ioredis';
import { AppConfig } from '../config.js';
import { validateSafeRedisCommand } from './guard.js';

export interface KeyInspectionResult {
  key: string;
  exists: boolean;
  type?: string;
  ttlSeconds?: number;
  encoding?: string;
  value?: any;
  itemCount?: number;
}

export class RedisClientWrapper {
  private client: Redis;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    const options: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    };

    if (config.tls) {
      options.tls = {};
    }

    this.client = new Redis(options);
  }

  async connect(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await this.connect();
      const reply = await this.client.ping();
      const latencyMs = Math.round(performance.now() - start);
      return { ok: reply === 'PONG', latencyMs };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async listKeys(pattern: string = '*', limit: number = 100): Promise<Array<{ key: string; type: string; ttl: number }>> {
    await this.connect();
    const resolvedLimit = Math.min(Math.max(limit, 1), 1000);
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', Math.min(resolvedLimit, 200));
      cursor = nextCursor;
      keys.push(...batch);
      if (keys.length >= resolvedLimit) {
        break;
      }
    } while (cursor !== '0');

    const sliced = keys.slice(0, resolvedLimit);
    const results: Array<{ key: string; type: string; ttl: number }> = [];

    for (const key of sliced) {
      try {
        const [type, ttl] = await Promise.all([this.client.type(key), this.client.ttl(key)]);
        results.push({ key, type, ttl });
      } catch {
        results.push({ key, type: 'unknown', ttl: -1 });
      }
    }

    return results;
  }

  async inspectKey(key: string): Promise<KeyInspectionResult> {
    await this.connect();
    const exists = await this.client.exists(key);
    if (!exists) {
      return { key, exists: false };
    }

    const [type, ttlSeconds] = await Promise.all([
      this.client.type(key),
      this.client.ttl(key),
    ]);

    let value: any = null;
    let itemCount: number | undefined;

    switch (type) {
      case 'string':
        value = await this.client.get(key);
        break;
      case 'hash':
        value = await this.client.hgetall(key);
        itemCount = Object.keys(value).length;
        break;
      case 'list':
        itemCount = await this.client.llen(key);
        value = await this.client.lrange(key, 0, 99);
        break;
      case 'set':
        itemCount = await this.client.scard(key);
        value = await this.client.smembers(key);
        if (Array.isArray(value) && value.length > 100) {
          value = value.slice(0, 100);
        }
        break;
      case 'zset':
        itemCount = await this.client.zcard(key);
        value = await this.client.zrange(key, 0, 99, 'WITHSCORES');
        break;
      default:
        value = `[Data type '${type}' preview not supported]`;
    }

    return {
      key,
      exists: true,
      type,
      ttlSeconds,
      value,
      itemCount,
    };
  }

  async getMemoryTelemetry(): Promise<Record<string, any>> {
    await this.connect();
    const [infoMemory, infoServer, infoClients, dbSize] = await Promise.all([
      this.client.info('memory'),
      this.client.info('server'),
      this.client.info('clients'),
      this.client.dbsize(),
    ]);

    const parseInfo = (raw: string): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const line of raw.split('\r\n')) {
        if (!line || line.startsWith('#')) continue;
        const [k, v] = line.split(':');
        if (k && v !== undefined) {
          result[k.trim()] = v.trim();
        }
      }
      return result;
    };

    const memory = parseInfo(infoMemory);
    const server = parseInfo(infoServer);
    const clients = parseInfo(infoClients);

    return {
      dbSize,
      redisVersion: server.redis_version || 'unknown',
      uptimeSeconds: Number(server.uptime_in_seconds || 0),
      connectedClients: Number(clients.connected_clients || 0),
      usedMemoryBytes: Number(memory.used_memory || 0),
      usedMemoryHuman: memory.used_memory_human || '0B',
      usedMemoryPeakHuman: memory.used_memory_peak_human || '0B',
      memFragmentationRatio: Number(memory.mem_fragmentation_ratio || 0),
    };
  }

  async executeReadOnlyCommand(command: string, args: string[] = []): Promise<any> {
    const safeCmd = validateSafeRedisCommand(command);
    await this.connect();
    return await this.client.call(safeCmd, ...args);
  }

  async close(): Promise<void> {
    try {
      this.client.disconnect();
    } catch {
      // Safe teardown
    }
  }
}
