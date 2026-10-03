import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { PlatformClient } from '../platform/client.js';
import { runTool } from './helpers.js';

export function registerReadTools(server: McpServer, client: PlatformClient): void {
  server.tool(
    'account_whoami',
    'Return the authenticated nServers account profile, the abilities (scopes) granted to this personal access token, and the remaining hourly MCP call budget. Call this first to introspect what the token can do.',
    {},
    async () =>
      runTool(client, 'account_whoami', async () => {
        const me = await client.me();
        return {
          user: me.userLabel,
          abilities: me.abilities,
          remaining_calls_this_hour: client.remainingCalls,
        };
      })
  );

  server.tool(
    'vps_list',
    'List all Cloud VPS instances owned by the account. Requires ability: vps:read.',
    {},
    async () =>
      runTool(client, 'vps_list', () => client.fetchApi('/api/v1/vps'))
  );

  server.tool(
    'vps_get',
    'Get details of a single VPS (status, region, specs, IPs). Requires ability: vps:read.',
    {
      vpsId: z.string().min(1).describe('VPS identifier from vps_list'),
    },
    async ({ vpsId }) =>
      runTool(client, 'vps_get', () =>
        client.fetchApi(`/api/v1/vps/${encodeURIComponent(vpsId)}`)
      )
  );

  server.tool(
    'vps_metrics',
    'Retrieve live resource metrics (CPU, RAM, disk, network) for a VPS. Requires ability: vps:read.',
    {
      vpsId: z.string().min(1).describe('VPS identifier from vps_list'),
    },
    async ({ vpsId }) =>
      runTool(client, 'vps_metrics', () =>
        client.fetchApi(`/api/v1/vps/${encodeURIComponent(vpsId)}/metrics`)
      )
  );

  server.tool(
    'vps_snapshots_list',
    'List snapshots available for a VPS. Requires ability: vps:read.',
    {
      vpsId: z.string().min(1).describe('VPS identifier from vps_list'),
    },
    async ({ vpsId }) =>
      runTool(client, 'vps_snapshots_list', () =>
        client.fetchApi(`/api/v1/vps/${encodeURIComponent(vpsId)}/snapshots`)
      )
  );

  server.tool(
    'game_servers_list',
    'List game servers (Minecraft, FiveM, survival, etc.) owned by the account. Requires ability: game_servers:read.',
    {},
    async () =>
      runTool(client, 'game_servers_list', () =>
        client.fetchApi('/api/v1/game-servers')
      )
  );

  server.tool(
    'game_server_get',
    'Get details of a single game server. Requires ability: game_servers:read.',
    {
      gameServerId: z.string().min(1).describe('Game server identifier'),
    },
    async ({ gameServerId }) =>
      runTool(client, 'game_server_get', () =>
        client.fetchApi(`/api/v1/game-servers/${encodeURIComponent(gameServerId)}`)
      )
  );

  server.tool(
    'operations_list',
    'List asynchronous infrastructure operations (power actions, rebuilds, provisioning) with status. Requires ability: operations:read.',
    {
      limit: z.number().int().positive().max(100).optional()
        .describe('Maximum number of operations to return'),
    },
    async ({ limit }) =>
      runTool(client, 'operations_list', () =>
        client.fetchApi(
          `/api/v1/operations${limit ? `?limit=${limit}` : ''}`
        )
      )
  );

  server.tool(
    'operation_get',
    'Get status and events of a single asynchronous operation. Requires ability: operations:read.',
    {
      operationId: z.string().min(1).describe('Operation identifier (e.g. op_...)'),
    },
    async ({ operationId }) =>
      runTool(client, 'operation_get', async () => {
        const id = encodeURIComponent(operationId);
        const [operation, events] = await Promise.all([
          client.fetchApi(`/api/v1/operations/${id}`),
          client.fetchApi(`/api/v1/operations/${id}/events`).catch(() => null),
        ]);
        return { operation, events };
      })
  );

  server.tool(
    'services_list',
    'List hosting/streaming/game services from the billing-linked service catalog (WHMCS bridge). Requires an authenticated client-area token.',
    {},
    async () =>
      runTool(client, 'services_list', () =>
        client.fetchApi('/site/v1/services')
      )
  );

  server.tool(
    'status_summary',
    'Get the public nServers status page summary: components, current state and uptime. Public endpoint, no ability required.',
    {},
    async () =>
      runTool(client, 'status_summary', () =>
        client.fetchApi('/site/v1/status')
      )
  );

  server.tool(
    'status_incidents',
    'List recent public incidents reported on the nServers status page. Public endpoint, no ability required.',
    {},
    async () =>
      runTool(client, 'status_incidents', () =>
        client.fetchApi('/site/v1/status/incidents')
      )
  );

  server.tool(
    'ai_runs_list',
    'List nAI coding-agent runs (sessions) executed by the account. Requires ability: ai:usage:read.',
    {},
    async () =>
      runTool(client, 'ai_runs_list', () =>
        client.fetchApi('/api/v1/ai/runs')
      )
  );

  server.tool(
    'ai_approvals_list',
    'List pending human approvals requested by nAI agent runs. Requires ability: ai:usage:read.',
    {},
    async () =>
      runTool(client, 'ai_approvals_list', () =>
        client.fetchApi('/api/v1/ai/runs/approvals')
      )
  );

  server.tool(
    'audit_list',
    'Query the account audit trail (mutations, logins, permission changes). Requires ability: audit:read.',
    {
      limit: z.number().int().positive().max(100).optional()
        .describe('Maximum number of audit entries to return'),
    },
    async ({ limit }) =>
      runTool(client, 'audit_list', () =>
        client.fetchApi(`/api/v1/audit${limit ? `?limit=${limit}` : ''}`)
      )
  );

  server.tool(
    'organizations_list',
    'List organizations the account belongs to. Requires ability: orgs:read.',
    {},
    async () =>
      runTool(client, 'organizations_list', () =>
        client.fetchApi('/api/v1/organizations')
      )
  );

  server.tool(
    'ssh_keys_list',
    'List SSH public keys registered on the account. Requires ability: vps:read.',
    {},
    async () =>
      runTool(client, 'ssh_keys_list', () =>
        client.fetchApi('/api/v1/ssh-keys')
      )
  );

  server.tool(
    'tokens_list',
    'List personal access tokens issued for the account (metadata only, never the secret). Requires ability: tokens:read.',
    {},
    async () =>
      runTool(client, 'tokens_list', () =>
        client.fetchApi('/api/v1/tokens')
      )
  );
}
