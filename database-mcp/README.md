# @nservers/hub-mcp-database

Official nServers MCP server for PostgreSQL & MySQL databases with native HTTP Server-Sent Events (SSE) transport, timing-safe Bearer authentication, and strict read-only AST safety guards.

---

## 🚀 Features

- **Native SSE Transport**: Fully compliant with the Model Context Protocol (MCP) specification for remote cloud deployments (`/sse` and `/messages`).
- **Dual Engine Support**: Compatible with PostgreSQL 12+ and MySQL 8.0+ / MariaDB 10.5+.
- **Zero-Trust & Read-Only**: Enforces strict mutation blocking (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`).
- **Secure Authentication**: Validates Bearer tokens via `Authorization: Bearer <MCP_AUTH_TOKEN>` or query parameter.
- **Integrated Healthcheck**: `/health` and `/ping` endpoints for load balancer and orchestrator telemetry.
- **Lightweight Container**: Multi-stage Docker image on Node.js 22 Alpine (~85MB) executing as non-root `node` user.

---

## 🛠️ MCP Tools

1. `list_tables`: List all database tables and views with their schemas.
2. `describe_table`: Inspect column types, nullability, defaults, and primary keys.
3. `read_query`: Execute declarative read-only queries (`SELECT`, `EXPLAIN`) with row caps.
4. `database_stats`: Retrieve connection telemetry, database engine version, and table counts.

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_CONNECTION` | `pgsql` | Database driver (`pgsql` or `mysql`). |
| `DB_HOST` | `127.0.0.1` | Database server host or IP. |
| `DB_PORT` | `5432` / `3306` | Database connection port. |
| `DB_DATABASE` | `postgres` / `mysql` | Target database name. |
| `DB_USERNAME` | `postgres` / `root` | Database user with read permissions. |
| `DB_PASSWORD` | `""` | Database password. |
| `DB_SSL` | `false` | Enable TLS/SSL connection (`true` or `false`). |
| `MCP_AUTH_TOKEN` | `""` | Bearer token required on incoming MCP connections. |
| `PORT` | `3000` | Internal container HTTP port. |
| `MAX_ROWS` | `1000` | Default row limit for query results (max: 5000). |

---

## 📦 Local Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run unit and integration tests
npm test

# Start server
npm start
```

---

## 🐳 Docker Image Build

```bash
docker build -t ghcr.io/nservers/hub-mcp-database:1.0.0 .
```
