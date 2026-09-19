# @nservers/hub-mcp-sqlite

Official **nServers** Model Context Protocol (MCP) server for SQLite and LibSQL databases with native Server-Sent Events (SSE) transport and AST read-only safety guards.

## Features
- **Strict Read-Only Enforcement**: Blocks any mutating SQL statements (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`, `ATTACH`, `DETACH`) and multi-query chaining.
- **Embedded and Remote Support**: Connects to local SQLite files, in-memory databases, and remote LibSQL/Turso instances.
- **Inspection Tools**: Lists tables/views, inspects column schemas and foreign keys, and retrieves database statistics.
- **Timing-Safe Authentication**: Timing-safe Bearer token validation on SSE connections.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `SQLITE_DATABASE_PATH` | `:memory:` | Local file path or `:memory:` |
| `LIBSQL_URL` | - | Optional remote LibSQL URL (e.g. `libsql://your-db.turso.io`) |
| `LIBSQL_AUTH_TOKEN` | - | Bearer token for remote LibSQL instances |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |
| `MAX_ROWS` | `1000` | Default query rows limit (max: 5000) |

## MCP Tools
- `list_tables`: List all user tables and views.
- `describe_table`: Inspect column names, data types, nullability, defaults, and primary keys.
- `read_query`: Execute read-only queries with automatic limit enforcement.
- `sqlite_stats`: Retrieve database telemetry, SQLite version, page counts, and approximate file size.
