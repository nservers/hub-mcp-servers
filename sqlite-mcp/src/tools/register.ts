import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SqliteClientWrapper } from '../sqlite/client.js';

export function registerSqliteTools(server: McpServer, sqlite: SqliteClientWrapper): void {
  server.tool(
    'list_tables',
    'List all user tables and views present in the SQLite or LibSQL database.',
    {},
    async () => {
      try {
        const tables = await sqlite.listTables();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: tables.length,
                  tables,
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
              text: `Failed to list tables: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'describe_table',
    'Inspect a table structure, returning column names, types, primary keys, nullability, and default values.',
    {
      tableName: z
        .string()
        .min(1)
        .describe('Name of the table to inspect (e.g. "users" or "orders")'),
    },
    async ({ tableName }) => {
      try {
        const columns = await sqlite.describeTable(tableName);
        if (columns.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Table "${tableName}" was not found or has no columns.`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  table: tableName,
                  columnsCount: columns.length,
                  columns,
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
              text: `Failed to describe table "${tableName}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'read_query',
    'Execute a read-only SQL query (SELECT, EXPLAIN, PRAGMA inspection). Mutation queries (INSERT, UPDATE, DELETE, DROP) are strictly blocked.',
    {
      query: z
        .string()
        .min(1)
        .describe('Read-only SQL query to execute (e.g. "SELECT id, name FROM users LIMIT 10")'),
      limit: z
        .number()
        .int()
        .positive()
        .max(5000)
        .optional()
        .describe('Maximum number of rows to return (default: 1000, max: 5000)'),
    },
    async ({ query, limit }) => {
      try {
        const result = await sqlite.executeQuery(query, limit);
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
              text: `Query execution failed: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sqlite_stats',
    'Retrieve SQLite / LibSQL database telemetry, version, table count, and approximate file size.',
    {},
    async () => {
      try {
        const stats = await sqlite.getSqliteStats();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to collect database stats: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
