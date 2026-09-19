# @nservers/hub-mcp-ecommerce

Official **nServers** Model Context Protocol (MCP) server for WooCommerce and Shopify store inspection with native Server-Sent Events (SSE) transport.

## Features
- **Multi-Platform Support**: Connects to WooCommerce (REST API v3) and Shopify (Admin REST API).
- **Order Inspection**: Queries recent customer orders, shipping status, line items, and totals.
- **Product Catalog & Inventory**: Lists inventory quantities, SKU codes, and prices.
- **Customer Directory**: Inspects customer lifetime value and order frequency.
- **Sales Analytics**: Aggregated 30-day revenue and average order value calculation.

## Environment Variables
| Variable | Default | Description |
|---|---|---|
| `STORE_PLATFORM` | `woocommerce` | Platform type (`woocommerce` or `shopify`) |
| `STORE_URL` | - | Store domain base URL |
| `STORE_API_KEY` | - | WooCommerce Consumer Key (`ck_...`) |
| `STORE_API_SECRET` | - | WooCommerce Consumer Secret (`cs_...`) |
| `SHOPIFY_ACCESS_TOKEN` | - | Shopify Admin API token (`shpat_...`) |
| `MCP_AUTH_TOKEN` | - | Secret Bearer token for MCP SSE connections |
| `PORT` | `3000` | HTTP listening port |
| `HOST` | `0.0.0.0` | HTTP listening address |

## MCP Tools
- `list_orders`: Lists recent customer orders with status filters.
- `get_order`: Inspects line items and customer billing details.
- `list_products`: Lists products with inventory counts and pricing.
- `list_customers`: Queries customer directory and spend metrics.
- `sales_summary`: Retrieves sales metrics and monthly revenue.
