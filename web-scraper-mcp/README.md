# @nservers/hub-mcp-web-scraper

Official **nServers** Model Context Protocol (MCP) server for web scraping and clean HTML-to-Markdown conversion for LLMs with native Server-Sent Events (SSE) transport.

## Features
- **Clean Markdown for LLMs**: Automatically converts web pages into concise, readable Markdown while removing ads, tracking scripts, navigation bars, and footers.
- **Link Discovery**: Extracts all hyperlinks on a page, categorizing internal and external destinations.
- **Structured Data Extraction**: Retrieves JSON-LD schema definitions and OpenGraph social metadata.
- **Timing-Safe Auth**: Secure Bearer token verification.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `USER_AGENT` | `nServers-Web-Scraper-MCP/1.0 (+https://nservers.io)` | HTTP User-Agent header |
| `REQUEST_TIMEOUT_MS` | `15000` | Fetch request timeout in milliseconds |
| `MAX_CONTENT_BYTES` | `2097152` | Maximum payload size in bytes (2MB) |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `scrape_url`: Fetches web page and converts to clean Markdown.
- `extract_links`: Discovers internal and external hyperlinks.
- `extract_structured_data`: Extracts JSON-LD and OpenGraph metadata.
