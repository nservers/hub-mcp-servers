# @nservers/hub-mcp-filesystem

Official **nServers** Model Context Protocol (MCP) server for sandboxed filesystem exploration, file reading, and directory search with strict directory traversal protection.

## Features
- **Strict Directory Traversal Guard**: Rejects relative escapes (`../`), null bytes, and symlink breakout attempts.
- **Line Slicing & Memory Protection**: Reads files with line ranges and configurable byte limits to prevent out-of-memory errors.
- **File Metadata & Search**: Searches filenames and inspects permissions, size, and modification timestamps.
- **Timing-Safe Auth**: Constant-time Bearer token verification.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `STORAGE_ROOT_PATH` | `./sandbox_data` | Root directory path strictly confining all file operations |
| `MAX_READ_BYTES` | `1048576` | Maximum file read limit in bytes (1MB) |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `list_directory`: Lists directory entries within sandbox root.
- `read_file`: Reads text content with line range options.
- `search_files`: Searches for files matching a query.
- `file_info`: Inspects file or directory metadata.
