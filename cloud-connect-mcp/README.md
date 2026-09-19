# @nservers/hub-mcp-cloud-connect

Official **nServers** Model Context Protocol (MCP) server for Cloud VPS and node infrastructure telemetry with native Server-Sent Events (SSE) transport.

## Features
- **Cloud Infrastructure Telemetry**: Real-time inspection of CPU load, memory utilization, NVMe disk metrics, and network throughput.
- **Node & VPS Inventory**: Lists cloud VPS instances, bare-metal nodes, and game server allocations.
- **Operational Health**: Inspects service health states, uptime ratios, and active alerts.
- **Audit Trails**: Queries historical infrastructure events and firewall modifications.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `NSERVERS_API_URL` | `https://api.nservers.io` | nServers Control Plane API Gateway URL |
| `NSERVERS_API_TOKEN` | - | Developer API Token with infrastructure read scopes |
| `ORGANIZATION_ID` | - | Optional organization ID filter |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `list_servers`: Lists virtual servers, nodes, and specifications.
- `get_server_metrics`: Retrieves real-time CPU, RAM, disk, and network metrics.
- `get_service_health`: Queries availability status and alerts.
- `get_audit_logs`: Retrieves recent operational and audit log entries.
