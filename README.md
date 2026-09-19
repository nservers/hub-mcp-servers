# nServers Hub - Official MCP Servers Collection

Official collection of open-source servers implementing the **Model Context Protocol (MCP)**, maintained by the **nServers** engineering team.

Each server in this repository is built to run in lightweight containers (Docker/Alpine), featuring native **Server-Sent Events (SSE)** transport, timing-safe Bearer authentication, and zero-trust security policies.

---

## Available Servers

| Directory | Name | Transport | Docker Image (GHCR) | Description |
|---|---|---|---|---|
| [`database-mcp/`](./database-mcp) | **Database MCP (PostgreSQL & MySQL)** | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-database:latest` | Table & schema inspection, telemetry, and strictly read-only SQL queries with AST-level safety guards. |

---

## Running Locally (e.g. `database-mcp`)

### 1. Requirements
- Node.js 22 LTS or higher
- npm

### 2. Install and Test
```bash
cd database-mcp
npm install
npm test
```

### 3. Development Server
```bash
npm run dev
```

The server listens on `http://localhost:3000`, exposing:
- `GET /health`: Public healthcheck endpoint.
- `GET /sse`: Authenticated MCP Server-Sent Events stream (`Authorization: Bearer <token>`).
- `POST /messages`: JSON-RPC 2.0 message handler.

---

## Automated Image Builds (CI/CD)

This repository uses **GitHub Actions** to build and publish production Docker containers to the **GitHub Container Registry (`ghcr.io`)** on every push to the `main` branch.

---

## License

Distributed under the **Apache 2.0** License. See individual package files for additional details.
