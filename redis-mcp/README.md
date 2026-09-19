# @nservers/hub-mcp-redis

Official **nServers** Model Context Protocol (MCP) server for Redis and in-memory key-value data structures with native Server-Sent Events (SSE) transport and strict read-only safety guards.

## Features
- **Strict Read-Only Enforcement**: Automatically blocks mutating commands (`FLUSHALL`, `FLUSHDB`, `DEL`, `CONFIG`, `SET`, `HSET`, etc.).
- **Key Inspection**: Scans and inspects Redis keys with type detection, TTL, memory encoding, and data representation.
- **Memory Telemetry**: Exposes Redis server metrics, memory fragmentation, peak memory, and connected clients.
- **Timing-Safe Authentication**: Bearer token validation resistant to timing side-channel attacks.
- **Container-Ready**: Multi-stage Alpine container running on non-root user `node` on port 3000.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `REDIS_HOST` | `127.0.0.1` | Target Redis server hostname or IP |
| `REDIS_PORT` | `6379` | Target Redis port |
| `REDIS_PASSWORD` | - | Authentication password |
| `REDIS_DB` | `0` | Database index (0-15) |
| `REDIS_TLS` | `false` | Enable TLS/SSL connection (`true` or `1`) |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `list_keys`: Scans and lists keys matching a pattern with non-blocking SCAN.
- `inspect_key`: Inspects key value, data type, TTL, and encoding.
- `redis_info`: Retrieves memory telemetry, server details, and client stats.
- `read_command`: Executes whitelisted read-only commands (e.g. GET, HGETALL, LRANGE).
