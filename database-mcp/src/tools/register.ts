import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DatabaseClient } from '../db/client.js';

export function registerDatabaseTools(server: McpServer, db: DatabaseClient): void {
  // 1. list_tables
  server.tool(
    'list_tables',
    'Lista todas as tabelas e views disponíveis no banco de dados com seus respectivos schemas.',
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
              text: `Erro ao listar tabelas: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // 2. describe_table
  server.tool(
    'describe_table',
    'Retorna a estrutura completa de colunas, tipos de dados, chaves primárias e constraints de uma tabela.',
    {
      tableName: z
        .string()
        .min(1)
        .describe('Nome da tabela a inspecionar (ex: "users" ou "public.orders")'),
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
                text: `A tabela "${tableName}" não foi encontrada no banco de dados ou não possui colunas visíveis.`,
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
              text: `Erro ao descrever tabela "${tableName}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // 3. read_query
  server.tool(
    'read_query',
    'Executa uma consulta SQL declarativa de leitura (SELECT ou EXPLAIN). Instruções destrutivas são bloqueadas.',
    {
      query: z
        .string()
        .min(1)
        .describe('Instrução SQL declarativa para execução (ex: "SELECT id, name FROM users LIMIT 10")'),
      limit: z
        .number()
        .int()
        .positive()
        .max(5000)
        .optional()
        .describe('Limite máximo de linhas a retornar (padrão: 1000, máx: 5000)'),
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
              text: `Falha na execução da query: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  // 4. database_stats
  server.tool(
    'database_stats',
    'Exibe informações e telemetria da conexão com o banco de dados (versão, estatísticas e contagem de tabelas).',
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
              text: `Erro ao coletar estatísticas do banco: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
