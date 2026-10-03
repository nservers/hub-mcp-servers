# @nservers/hub-mcp-nservers-platform

Official **nServers** control-plane Model Context Protocol (MCP) server. Exposes the
customer-facing control plane (VPS, game servers, operations, audit, nAI runs,
services, status) to MCP clients — Claude Code, Cursor, Codex, Cline — over
Server-Sent Events (SSE).

## Security model

- **Per-connection PAT**: clients connect with `Authorization: Bearer <sanctum PAT>`.
  The token is forwarded to `api.nservers.io` on every upstream call — tenant
  isolation, abilities, step-up and audit are enforced by the control plane itself.
- **Token validation on connect**: `/sse` calls `GET /api/v1/me` before opening the
  stream; invalid or revoked PATs are rejected with 401.
- **Ability scoping**: each tool documents the Sanctum ability it requires
  (`vps:read`, `vps:control`, `audit:read`, ...). Issue PATs with the minimum
  abilities the agent needs — read-only PATs get read-only agents.
- **Step-up passthrough**: mutating tools accept an optional `stepUpToken`
  forwarded as `X-Step-Up-Token`. When the API demands step-up and none is given,
  the tool returns a structured `approval_required` payload instructing how a
  human completes verification — agents can never mint step-up tokens alone.
- **Idempotency**: every mutating call carries an auto-generated
  `Idempotency-Key` header as required by the control plane.
- **Hourly budget**: per-session tool-call budget (`MAX_CALLS_PER_HOUR`, default
  500) guards against runaway agents.
- **Optional gateway key**: `MCP_AUTH_TOKEN` adds a deployment-level gate checked
  via the `X-MCP-Auth` header (or `?mcp_key=` query), on top of the PAT.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NSERVERS_API_URL` | `https://api.nservers.io` | nServers Control Plane API base URL |
| `ORGANIZATION_ID` | - | Optional `X-Organization-Id` header for org context |
| `MCP_AUTH_TOKEN` | - | Optional gateway key required on `X-MCP-Auth` |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |
| `REQUEST_TIMEOUT_MS` | `15000` | Upstream API timeout |
| `MAX_CALLS_PER_HOUR` | `500` | Per-session hourly tool-call budget |

## MCP Tools

### Read tools
| Tool | Endpoint | Ability |
|---|---|---|
| `account_whoami` | `GET /api/v1/me` | any valid PAT |
| `vps_list` / `vps_get` / `vps_metrics` / `vps_snapshots_list` | `GET /api/v1/vps*` | `vps:read` |
| `game_servers_list` / `game_server_get` | `GET /api/v1/game-servers*` | `game_servers:read` |
| `operations_list` / `operation_get` | `GET /api/v1/operations*` | `operations:read` |
| `services_list` | `GET /site/v1/services` | client-area token |
| `status_summary` / `status_incidents` | `GET /site/v1/status*` | public |
| `ai_runs_list` / `ai_approvals_list` | `GET /api/v1/ai/runs*` | `ai:usage:read` |
| `audit_list` | `GET /api/v1/audit` | `audit:read` |
| `organizations_list` | `GET /api/v1/organizations` | `orgs:read` |
| `ssh_keys_list` | `GET /api/v1/ssh-keys` | `vps:read` |
| `tokens_list` | `GET /api/v1/tokens` | `tokens:read` |

### Write tools (all send `Idempotency-Key`, accept `stepUpToken`)
| Tool | Endpoint | Ability |
|---|---|---|
| `vps_action` | `POST /api/v1/vps/{id}/actions/{action}` | `vps:control` (+ step-up for sensitive/protected) |
| `vps_snapshot_create` / `vps_snapshot_restore` / `vps_snapshot_delete` | `/api/v1/vps/{id}/snapshots*` | `vps:control` |
| `vps_protection_toggle` | `POST /api/v1/vps/{id}/protection` | `vps:control` |
| `ssh_key_create` / `ssh_key_delete` | `/api/v1/ssh-keys*` | `vps:control` |
| `game_server_action` | `POST /api/v1/game-servers/{id}/actions/{action}` | `game_servers:control` |
| `ai_run_cancel` / `ai_approval_decide` | `POST /api/v1/ai/runs*` | `ai:ask` |
| `service_action` | `POST /site/v1/services/{key}/actions/{action}` | client-area token |

## Client configuration

```jsonc
// Claude Code / Cursor mcp config
{
  "mcpServers": {
    "nservers": {
      "url": "https://mcp.nservers.io/platform/sse",
      "headers": { "Authorization": "Bearer <your-nservers-PAT>" }
    }
  }
}
```

## Endpoints

- `GET /health`, `GET /ping` — unauthenticated probe (checks API reachability).
- `GET /sse` — MCP SSE stream (requires PAT bearer).
- `POST /messages?sessionId=...` — JSON-RPC message channel for the SSE session.
