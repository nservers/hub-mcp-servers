# @nservers/hub-mcp-git

Official **nServers** Model Context Protocol (MCP) server for Git repository exploration, diff generation, and commit logs with native Server-Sent Events (SSE) transport.

## Features
- **Working Tree Inspection**: Real-time status reporting for staged, modified, and untracked changes.
- **Unified Diff Generation**: Clean diffs between commits, branches, or working directory files.
- **Commit History**: Commit log navigation with pagination and author metadata.
- **Branch Management**: Lists active local and remote branches.
- **Timing-Safe Auth**: Constant-time Bearer token verification.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `REPOSITORY_PATH` | `.` | Root path of target Git repository |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `git_status`: Query branch status and working tree modifications.
- `git_log`: Retrieve commit logs with author information.
- `git_branches`: List local and remote branches.
- `git_diff`: Generate unified diff output.
- `git_show`: Inspect revisions or specific file blobs.
