# @nservers/hub-mcp-docker

Official **nServers** Model Context Protocol (MCP) server for Docker Engine container inspection, telemetry, and logs with native Server-Sent Events (SSE) transport.

## Features
- **Container Telemetry & Inspection**: Lists running and stopped containers, inspects volume mounts, port mappings, and sanitized environment variables.
- **Log Streaming**: Retrieves recent stdout/stderr output with custom line limits and timestamp toggles.
- **Resource Usage Stats**: Snapshot telemetry metrics (CPU percentage, memory bytes, limits, and network throughput).
- **Image Inventory**: Lists available container images with tags and sizes.
- **Secure Access**: Timing-safe Bearer authentication on SSE endpoints.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `DOCKER_HOST` | - | Docker daemon host (e.g. `tcp://127.0.0.1:2375` or socket path) |
| `DOCKER_SOCKET_PATH` | `/var/run/docker.sock` | Local Unix socket or Windows named pipe |
| `DOCKER_TLS_VERIFY` | `false` | Enable TLS verification (`1` or `true`) |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `list_containers`: Lists Docker containers with status, image, and ports.
- `inspect_container`: Low-level inspection with network, mount, and sanitized env details.
- `container_logs`: Fetches recent stdout/stderr logs.
- `container_stats`: Live snapshot of CPU and memory utilization.
- `list_images`: Lists local container images and sizes.
