import test from 'node:test';
import assert from 'node:assert';
import { CloudConnectClient } from '../dist/cloud/client.js';

test('cloud client returns servers with valid structure', async () => {
  const client = new CloudConnectClient({
    apiUrl: 'https://api.nservers.io',
    apiToken: 'mock_token',
    portHttp: 3000,
    hostHttp: '0.0.0.0',
    timeoutMs: 5000,
  });

  const servers = await client.listServers();
  assert.ok(Array.isArray(servers));
  assert.ok(servers.length >= 3);
  assert.strictEqual(servers[0].status, 'running');
  assert.ok(servers[0].specs.vCpu > 0);
});

test('cloud client retrieves valid telemetry metrics', async () => {
  const client = new CloudConnectClient({
    apiUrl: 'https://api.nservers.io',
    apiToken: 'mock_token',
    portHttp: 3000,
    hostHttp: '0.0.0.0',
    timeoutMs: 5000,
  });

  const metrics = await client.getServerMetrics('srv-br-sp-01');
  assert.strictEqual(metrics.serverId, 'srv-br-sp-01');
  assert.ok(metrics.cpuPercent >= 0 && metrics.cpuPercent <= 100);
  assert.ok(metrics.memoryTotalMb > 0);
  assert.ok(metrics.diskTotalGb > 0);
});

test('cloud client checks service health and audit logs', async () => {
  const client = new CloudConnectClient({
    apiUrl: 'https://api.nservers.io',
    apiToken: 'mock_token',
    portHttp: 3000,
    hostHttp: '0.0.0.0',
    timeoutMs: 5000,
  });

  const health = await client.getServiceHealth('nginx-edge');
  assert.strictEqual(health.healthy, true);
  assert.strictEqual(health.status, 'operational');

  const logs = await client.getAuditLogs(5);
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length > 0);
});
