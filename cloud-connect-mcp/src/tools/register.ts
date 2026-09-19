import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CloudConnectClient } from '../cloud/client.js';

export function registerCloudConnectTools(server: McpServer, cloud: CloudConnectClient): void {
  server.tool(
    'list_servers',
    'List nServers Cloud VPS instances, bare metal nodes, and service containers with runtime status and specs.',
    {
      status: z
        .enum(['running', 'stopped', 'restarting', 'provisioning'])
        .optional()
        .describe('Filter instances by current execution status'),
    },
    async ({ status }) => {
      try {
        const servers = await cloud.listServers(status);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: servers.length,
                  servers,
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
              text: `Failed to list servers: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_server_metrics',
    'Retrieve live hardware telemetry and resource utilization (CPU, RAM, Disk, Network throughput) for a specific server.',
    {
      serverId: z
        .string()
        .min(1)
        .describe('Target server identifier (e.g. "srv-br-sp-01")'),
    },
    async ({ serverId }) => {
      try {
        const metrics = await cloud.getServerMetrics(serverId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch metrics for "${serverId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_service_health',
    'Check operational health, SLA availability, and active alert notifications for an infrastructure service or node.',
    {
      serviceId: z
        .string()
        .min(1)
        .describe('Service identifier or hypervisor node tag'),
    },
    async ({ serviceId }) => {
      try {
        const health = await cloud.getServiceHealth(serviceId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(health, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to query health for service "${serviceId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'get_audit_logs',
    'Retrieve recent operational audit trails, deployment events, and firewall rule modifications.',
    {
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .default(20)
        .describe('Number of events to retrieve (default: 20, max: 100)'),
    },
    async ({ limit }) => {
      try {
        const logs = await cloud.getAuditLogs(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: logs.length,
                  logs,
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
              text: `Failed to collect audit logs: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
