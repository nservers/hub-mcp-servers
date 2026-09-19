import { createClient, Client } from '@libsql/client';
import { AppConfig } from '../config.js';
import { validateReadOnlySqliteQuery } from './guard.js';

export interface SqliteTableInfo {
  name: string;
  type: string;
  sql?: string;
}

export interface SqliteColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

export class SqliteClientWrapper {
  private client: Client;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;

    let url: string;
    if (config.libsqlUrl) {
      url = config.libsqlUrl;
    } else if (config.dbPath === ':memory:' || !config.dbPath) {
      url = 'file::memory:?cache=shared';
    } else {
      url = config.dbPath.startsWith('file:') ? config.dbPath : `file:${config.dbPath}`;
    }

    this.client = createClient({
      url,
      authToken: config.libsqlAuthToken,
    });
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await this.client.execute('SELECT 1 as ping');
      const latencyMs = Math.round(performance.now() - start);
      return { ok: true, latencyMs };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async listTables(): Promise<SqliteTableInfo[]> {
    const res = await this.client.execute(
      "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );

    return res.rows.map((r) => ({
      name: String(r.name),
      type: String(r.type),
      sql: r.sql ? String(r.sql) : undefined,
    }));
  }

  async describeTable(tableName: string): Promise<SqliteColumnInfo[]> {
    // Sanitize identifier by quoting
    const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
    if (!safeName) {
      throw new Error(`Invalid table name: '${tableName}'`);
    }

    const res = await this.client.execute(`PRAGMA table_info("${safeName}")`);
    return res.rows.map((r) => ({
      cid: Number(r.cid),
      name: String(r.name),
      type: String(r.type),
      notnull: Number(r.notnull),
      dflt_value: r.dflt_value,
      pk: Number(r.pk),
    }));
  }

  async executeQuery(rawSql: string, limit?: number): Promise<{ columns: string[]; rows: any[]; rowCount: number }> {
    const safeSql = validateReadOnlySqliteQuery(rawSql);
    const resolvedLimit = limit ? Math.min(Math.max(limit, 1), 5000) : this.config.maxRows;

    // Append limit if not already present
    let queryWithLimit = safeSql;
    if (!/\bLIMIT\b/i.test(safeSql) && !safeSql.toUpperCase().startsWith('PRAGMA')) {
      queryWithLimit = `${safeSql} LIMIT ${resolvedLimit}`;
    }

    const res = await this.client.execute(queryWithLimit);
    return {
      columns: res.columns,
      rows: res.rows,
      rowCount: res.rows.length,
    };
  }

  async getSqliteStats(): Promise<Record<string, any>> {
    const [versionRes, pageCountRes, pageSizeRes, tablesCountRes] = await Promise.all([
      this.client.execute('SELECT sqlite_version() as version'),
      this.client.execute('PRAGMA page_count'),
      this.client.execute('PRAGMA page_size'),
      this.client.execute("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"),
    ]);

    const pageCount = Number(pageCountRes.rows[0]?.[0] ?? pageCountRes.rows[0]?.page_count ?? 0);
    const pageSize = Number(pageSizeRes.rows[0]?.[0] ?? pageSizeRes.rows[0]?.page_size ?? 0);

    return {
      engine: this.config.libsqlUrl ? 'LibSQL (Remote)' : 'SQLite3 (Embedded)',
      sqliteVersion: String(versionRes.rows[0]?.version ?? 'unknown'),
      tablesCount: Number(tablesCountRes.rows[0]?.count ?? 0),
      pageCount,
      pageSize,
      approximateSizeBytes: pageCount * pageSize,
      dbPath: this.config.libsqlUrl ? this.config.libsqlUrl : this.config.dbPath,
    };
  }

  async close(): Promise<void> {
    try {
      this.client.close();
    } catch {
      // Safe teardown
    }
  }
}
