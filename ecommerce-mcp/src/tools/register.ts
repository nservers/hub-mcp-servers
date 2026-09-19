import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { EcommerceClient } from '../ecommerce/client.js';

export function registerEcommerceTools(server: McpServer, ecommerce: EcommerceClient): void {
  server.tool(
    'list_orders',
    'Retrieve recent customer orders from WooCommerce or Shopify with status, total amounts, and customer contact details.',
    {
      status: z
        .string()
        .optional()
        .describe('Filter by order status (e.g. "completed", "processing", "pending")'),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .default(20)
        .describe('Number of orders to retrieve (default: 20, max: 100)'),
    },
    async ({ status, limit }) => {
      try {
        const orders = await ecommerce.listOrders(status, limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: orders.length,
                  orders,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to list orders: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_order',
    'Retrieve full details of a specific e-commerce order including purchased line items and billing information.',
    {
      orderId: z
        .string()
        .min(1)
        .describe('Unique order identifier or order number (e.g. "1042")'),
    },
    async ({ orderId }) => {
      try {
        const order = await ecommerce.getOrder(orderId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(order, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to retrieve order "${orderId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_products',
    'List store products with real-time stock quantities, SKUs, and pricing.',
    {
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .default(20)
        .describe('Number of products to retrieve (default: 20, max: 100)'),
    },
    async ({ limit }) => {
      try {
        const products = await ecommerce.listProducts(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: products.length,
                  products,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to list products: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_customers',
    'Query registered customers, total lifetime spend, and order history counts.',
    {
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .default(20)
        .describe('Number of customers to retrieve (default: 20, max: 100)'),
    },
    async ({ limit }) => {
      try {
        const customers = await ecommerce.listCustomers(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: customers.length,
                  customers,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to list customers: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sales_summary',
    'Retrieve high-level sales metrics, monthly revenue aggregate, and average order value (AOV).',
    {},
    async () => {
      try {
        const summary = await ecommerce.getSalesSummary();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to collect sales summary: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
