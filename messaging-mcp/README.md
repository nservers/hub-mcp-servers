# @nservers/hub-mcp-messaging

Official **nServers** Model Context Protocol (MCP) server for structured messaging and webhook dispatching to Slack, Discord, and custom HTTP endpoints with native Server-Sent Events (SSE) transport.

## Features
- **Slack Dispatch**: Sends markdown text and Block Kit components to Slack Incoming Webhooks.
- **Discord Dispatch**: Sends text messages and rich embedded cards to Discord Webhooks.
- **Custom HTTP Webhooks**: Transmits arbitrary structured JSON payloads with custom headers and verbs (POST/PUT/PATCH).
- **Transport Connectivity Checks**: Validates configuration readiness across all channels.
- **Timing-Safe Auth**: Constant-time Bearer token verification.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `SLACK_WEBHOOK_URL` | - | Slack Incoming Webhook URL |
| `DISCORD_WEBHOOK_URL` | - | Discord Webhook URL |
| `CUSTOM_WEBHOOK_URL` | - | Default custom HTTP webhook target URL |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `send_slack_message`: Dispatches messages or blocks to Slack.
- `send_discord_message`: Dispatches messages or embeds to Discord.
- `send_webhook`: Transmits custom structured JSON payload to any HTTP endpoint.
- `test_connectivity`: Verifies configured webhook destinations.
