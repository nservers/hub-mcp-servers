import pg from 'pg';
import mysql from 'mysql2/promise';
import { AppConfig } from '../config.js';
import { validateReadOnlyQuery } from './guard.js';

export interface TableSummary {
  name: string;
  schema?: string;
  type: 'BASE TABLE' | 'VIEW';
  estimatedRows?: number;
}

export interface ColumnDetail {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string | null;
  isPrimaryKey: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
}

export interface DatabaseStats {
  engine: 'PostgreSQL' | 'MySQL';
  host: string;
  database: string;
  version: string;
  totalTables: number;
  activeConnections?: number;
}

export class DatabaseClient {
  private pgPool?: pg.Pool;
  private mysqlPool?: mysql.Pool;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    if (config.connection === 'pgsql') {
      this.pgPool = new pg.Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      this.mysqlPool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 30000,
        connectTimeout: 5000,
      });
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      if (this.pgPool) {
        await this.pgPool.query('SELECT 1 AS ping');
      } else if (this.mysqlPool) {
        await this.mysqlPool.query('SELECT 1 AS ping');
      }
      return { ok: true, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { ok: false, latencyMs: Date.now() - start, error: e?.message || String(e) };
    }
  }

  async listTables(): Promise<TableSummary[]> {
    if (this.pgPool) {
      const sql = `
        SELECT 
          table_schema AS schema_name,
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        ORDER BY table_schema, table_name;
      `;
      const res = await this.pgPool.query(sql);
      return res.rows.map((row) => ({
        name: row.table_name,
        schema: row.schema_name,
        type: row.table_type === 'VIEW' ? 'VIEW' : 'BASE TABLE',
      }));
    } else if (this.mysqlPool) {
      const sql = `
        SELECT 
          TABLE_NAME AS table_name,
          TABLE_TYPE AS table_type,
          TABLE_ROWS AS estimated_rows
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME;
      `;
      const [rows] = await this.mysqlPool.query(sql, [this.config.database]);
      return (rows as any[]).map((row) => ({
        name: row.table_name,
        type: row.table_type === 'VIEW' ? 'VIEW' : 'BASE TABLE',
        estimatedRows: Number(row.estimated_rows || 0),
      }));
    }
    return [];
  }

  async describeTable(tableName: string): Promise<ColumnDetail[]> {
    if (this.pgPool) {
      const parts = tableName.split('.');
      const schemaName = parts.length > 1 ? parts[0] : 'public';
      const tbl = parts.length > 1 ? parts[1] : parts[0];

      const sql = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_schema, ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.table_schema = pk.table_schema 
             AND c.table_name = pk.table_name 
             AND c.column_name = pk.column_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position;
      `;
      const res = await this.pgPool.query(sql, [schemaName, tbl]);
      return res.rows.map((r) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        defaultValue: r.column_default,
        isPrimaryKey: Boolean(r.is_primary_key),
      }));
    } else if (this.mysqlPool) {
      const sql = `
        SELECT 
          COLUMN_NAME AS column_name,
          COLUMN_TYPE AS data_type,
          IS_NULLABLE AS is_nullable,
          COLUMN_DEFAULT AS column_default,
          COLUMN_KEY AS column_key
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION;
      `;
      const [rows] = await this.mysqlPool.query(sql, [this.config.database, tableName]);
      return (rows as any[]).map((r) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        defaultValue: r.column_default,
        isPrimaryKey: r.column_key === 'PRI',
      }));
    }
    return [];
  }

  async executeQuery(rawSql: string, limit?: number): Promise<QueryResult> {
    const validatedSql = validateReadOnlyQuery(rawSql);
    const maxRows = Math.min(limit || this.config.maxRows, 5000);
    const start = Date.now();

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('SET statement_timeout = 30000'); // 30s timeout
        const res = await client.query(validatedSql);
        const executionTimeMs = Date.now() - start;
        const total = res.rows.length;
        const truncated = total > maxRows;
        const rows = truncated ? res.rows.slice(0, maxRows) : res.rows;
        const columns = res.fields ? res.fields.map((f) => f.name) : [];

        return {
          columns,
          rows,
          rowCount: rows.length,
          executionTimeMs,
          truncated,
        };
      } finally {
        client.release();
      }
    } else if (this.mysqlPool) {
      const [result, fields] = await this.mysqlPool.query(validatedSql);
      const executionTimeMs = Date.now() - start;
      const allRows = Array.isArray(result) ? (result as any[]) : [];
      const total = allRows.length;
      const truncated = total > maxRows;
      const rows = truncated ? allRows.slice(0, maxRows) : allRows;
      const columns = Array.isArray(fields) ? fields.map((f: any) => f.name) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
        truncated,
      };
    }

    throw new Error('Nenhum pool de conexão de banco de dados ativo.');
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const tables = await this.listTables();
    if (this.pgPool) {
      const resVersion = await this.pgPool.query('SELECT version();');
      const versionStr = resVersion.rows[0]?.version || 'PostgreSQL';

      let activeConnections = 0;
      try {
        const resConn = await this.pgPool.query(
          "SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database();"
        );
        activeConnections = Number(resConn.rows[0]?.count || 0);
      } catch {}

      return {
        engine: 'PostgreSQL',
        host: this.config.host,
        database: this.config.database,
        version: versionStr,
        totalTables: tables.length,
        activeConnections,
      };
    } else if (this.mysqlPool) {
      const [verRows] = await this.mysqlPool.query('SELECT VERSION() as version;');
      const versionStr = (verRows as any[])[0]?.version || 'MySQL';

      let activeConnections = 0;
      try {
        const [connRows] = await this.mysqlPool.query("SHOW STATUS LIKE 'Threads_connected';");
        activeConnections = Number((connRows as any[])[0]?.Value || 0);
      } catch {}

      return {
        engine: 'MySQL',
        host: this.config.host,
        database: this.config.database,
        version: versionStr,
        totalTables: tables.length,
        activeConnections,
      };
    }

    throw new Error('Nenhum pool de conexão ativo.');
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.mysqlPool) {
      await this.mysqlPool.end();
    }
  }
}
