import test from 'node:test';
import assert from 'node:assert';
import { DockerClientWrapper } from '../dist/docker/client.js';

test('DockerClientWrapper instantiates and exposes inspection methods', async () => {
  const client = new DockerClientWrapper({
    portHttp: 3000,
    hostHttp: '0.0.0.0',
  });

  assert.strictEqual(typeof client.listContainers, 'function');
  assert.strictEqual(typeof client.inspectContainer, 'function');
  assert.strictEqual(typeof client.getContainerLogs, 'function');
  assert.strictEqual(typeof client.getContainerStats, 'function');
  assert.strictEqual(typeof client.listImages, 'function');

  const connection = await client.testConnection();
  assert.ok(typeof connection.latencyMs === 'number');
});
