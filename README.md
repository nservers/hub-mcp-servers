# nServers Hub - Official MCP Servers Collection

Official collection of open-source servers implementing the **Model Context Protocol (MCP)**, maintained by the **nServers** engineering team.

Each server in this repository is built to run in lightweight containers (Docker/Alpine), featuring native **Server-Sent Events (SSE)** transport, timing-safe Bearer authentication, and zero-trust security policies.

---

## Official nServers MCP Suite

| Server | Status | Transport | Docker Image (GHCR) | Description |
|---|---|---|---|---|
| [`database-mcp/`](./database-mcp) | **Active** | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-database:latest` | PostgreSQL & MySQL schema inspection, telemetry, and strictly read-only queries with AST-level safety guards. |
| `redis-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-redis:latest` | Redis key-value inspection, memory telemetry, TTL analysis, and read-only cache exploration. |
| `sqlite-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-sqlite:latest` | SQLite & LibSQL embedded database query runner and schema inspector for local and cloud environments. |
| `cloud-connect-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-cloud-connect:latest` | nServers Cloud VPS control plane connector for real-time node metrics, resource telemetry, and container states. |
| `docker-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-docker:latest` | Docker Engine client for inspecting containers, images, volumes, and monitoring live container health metrics. |
| `git-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-git:latest` | Git repository explorer with support for unified diff generation, commit inspection, and branch tree navigation. |
| `ecommerce-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-ecommerce:latest` | Read-only e-commerce gateway for WooCommerce and Shopify orders, customer lookup, and real-time inventory counts. |
| `web-scraper-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-web-scraper:latest` | Headless content scraper with automatic HTML-to-Markdown conversion and link discovery for LLM research. |
| `messaging-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-messaging:latest` | Secure webhook and dispatch connector for sending structured alerts to Discord, Slack, and custom HTTP endpoints. |
| `filesystem-sandbox-mcp` | In Catalog | SSE (Port 3000) | `ghcr.io/nservers/hub-mcp-filesystem:latest` | Sandboxed file system navigator with path traversal protection and secure directory search. |

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
