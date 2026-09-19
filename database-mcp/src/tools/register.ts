import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseClient } from '../db/client.js';

export function registerDatabaseTools(server: McpServer, db: DatabaseClient): void {
  server.tool(
    'list_tables',
    'List all tables and views available in the database with their respective schemas.',
    {},
    async () => {
      try {
        const tables = await db.listTables();
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
    'Inspect a table structure including columns, data types, nullability, defaults, and primary keys.',
    {
      tableName: z
        .string()
        .min(1)
        .describe('Table name to inspect (e.g. "users" or "public.orders")'),
    },
    async ({ tableName }) => {
      try {
        const columns = await db.describeTable(tableName);
        if (columns.length === 0) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Table "${tableName}" was not found or contains no accessible columns.`,
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
    'Execute a read-only declarative SQL query (SELECT, EXPLAIN). Mutation statements are blocked.',
    {
      query: z
        .string()
        .min(1)
        .describe('Declarative SQL query to execute (e.g. "SELECT id, name FROM users LIMIT 10")'),
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
        const result = await db.executeQuery(query, limit);
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
    'database_stats',
    'Retrieve database connection telemetry, version details, and table statistics.',
    {},
    async () => {
      try {
        const stats = await db.getDatabaseStats();
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
              text: `Failed to collect database statistics: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
