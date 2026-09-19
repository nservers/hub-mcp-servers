import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RedisClientWrapper } from '../redis/client.js';

export function registerRedisTools(server: McpServer, redis: RedisClientWrapper): void {
  server.tool(
    'list_keys',
    'Scan and list Redis keys matching a pattern, returning key names, data types, and TTLs using non-blocking SCAN.',
    {
      pattern: z
        .string()
        .default('*')
        .describe('Key pattern filter (e.g. "user:*" or "*cache*")'),
      limit: z
        .number()
        .int()
        .positive()
        .max(1000)
        .default(100)
        .describe('Maximum number of keys to return (default: 100, max: 1000)'),
    },
    async ({ pattern, limit }) => {
      try {
        const keys = await redis.listKeys(pattern, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  pattern,
                  count: keys.length,
                  keys,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to list keys: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'inspect_key',
    'Inspect a specific Redis key, revealing its data type, TTL in seconds, memory encoding, and data structure value.',
    {
      key: z
        .string()
        .min(1)
        .describe('Exact Redis key to inspect (e.g. "session:user_123")'),
    },
    async ({ key }) => {
      try {
        const details = await redis.inspectKey(key);
        if (!details.exists) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ key, exists: false, message: 'Key does not exist in the active database.' }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to inspect key "${key}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'redis_info',
    'Retrieve Redis server status, memory consumption telemetry, client connection count, and database size.',
    {},
    async () => {
      try {
        const telemetry = await redis.getMemoryTelemetry();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(telemetry, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch Redis info: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'read_command',
    'Execute a whitelisted read-only Redis command (e.g. GET, HGETALL, LRANGE, SMEMBERS, ZRANGE). Mutating operations are strictly rejected.',
    {
      command: z
        .string()
        .min(1)
        .describe('Read-only Redis command (e.g. "GET", "HGETALL", "LRANGE")'),
      args: z
        .array(z.string())
        .default([])
        .describe('List of string arguments for the command (e.g. ["mykey", "0", "10"])'),
    },
    async ({ command, args }) => {
      try {
        const result = await redis.executeReadOnlyCommand(command, args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ command, result }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Command execution failed: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
