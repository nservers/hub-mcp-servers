# AGENTS.md - nServers MCP Servers Hub (`hub-mcp-servers`)

This document defines the architecture principles, code conventions, security restrictions, and contribution standards for the **`hub-mcp-servers`** monorepo.

---

## 1. Primary Directives & Invariants

1. **Language Standard**:
   - All source code, identifiers, comments, parameter descriptions (`zod.describe`), MCP tool definitions, console logs, HTTP responses, error messages, and documentation **must strictly be written in English**.
   - Do NOT use Portuguese or any other language in source files, git commits, or README documents within this repository.

2. **Clean & Concise Code**:
   - Do NOT add redundant or obvious comments (e.g. `// 1. list_tables`, `// 30s timeout`, `// starts the server`).
   - Keep comments limited to essential, non-obvious security or algorithmic rationales (such as regex AST parsing, security guards, or protocol-level edge cases).

3. **Zero-Trust Security & Read-Only Invariants**:
   - Database and system connectors must enforce strict read-only execution by default unless explicitly designed for writes with transactional approvals.
   - Destructive commands (`DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`, multi-statement injections) must be blocked before hitting the driver.
   - All incoming connections must require and validate timing-safe Bearer credentials when configured.

4. **Architecture & Transport**:
   - **Protocol**: Model Context Protocol (MCP) via HTTP **Server-Sent Events (SSE)** (`/sse` and `/messages`).
   - **Health & Telemetry**: Every server must provide unauthenticated `/health` and `/ping` endpoints for orchestrator probes (Coolify, Traefik, Docker healthchecks).
   - **Runtime**: Node.js 22 LTS with native ES Modules (`"type": "module"`) and TypeScript.
   - **Containerization**: Multi-stage Dockerfile based on `node:22-alpine` executing as non-root user `node`.

---

## 2. Monorepo Organization

```text
hub-mcp-servers/
├── .github/
│   └── workflows/              # GitHub Actions CI/CD for publishing images to ghcr.io
├── database-mcp/               # PostgreSQL & MySQL MCP Server (Port 3000, SSE)
│   ├── src/
│   │   ├── config.ts           # Environment schema validation (Zod)
│   │   ├── db/                 # Database client pool and read-only query guard
│   │   ├── tools/              # MCP tool registration with English schemas
│   │   └── index.ts            # Express server, SSE transport and shutdown handlers
│   ├── test/                   # Integration & unit test suite (node --test)
│   ├── Dockerfile              # Multi-stage Alpine container
│   ├── package.json
│   └── tsconfig.json
├── AGENTS.md                   # Engineering standards (this file)
├── LICENSE                     # Apache-2.0
└── README.md                   # Global catalog documentation
```

---

## 3. Testing & Validation Rules

- Every server must include automated tests using Node's built-in test runner (`node --test`).
- Before committing any change, verify:
  1. `npm run build`: TypeScript compiles without any errors or warnings.
  2. `npm test`: All tests pass 100% cleanly.
  3. Git status is clean and free of temporary build artifacts or credentials.

---

## 4. Docker Image Naming Convention

- Image registry: GitHub Container Registry (`ghcr.io`).
- Namespace: `ghcr.io/nservers/hub-mcp-<service-name>:<tag>`.
- Examples:
  - `ghcr.io/nservers/hub-mcp-database:latest`
  - `ghcr.io/nservers/hub-mcp-database:1.0.0`
