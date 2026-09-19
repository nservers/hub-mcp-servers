import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

test('docker-mcp boots up, responds to healthcheck, and enforces Bearer auth on /sse', async (t) => {
  const env = {
    ...process.env,
    PORT: '3995',
    HOST: '127.0.0.1',
    MCP_AUTH_TOKEN: 'test_secret_docker_token_666',
  };

  const proc = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    env,
    stdio: 'pipe',
  });

  t.after(() => {
    proc.kill();
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Health endpoint test
  const resHealth = await fetch('http://127.0.0.1:3995/health');
  assert.ok([200, 503].includes(resHealth.status));
  const dataHealth = await resHealth.json();
  assert.strictEqual(dataHealth.service, 'docker-mcp');
  assert.strictEqual(dataHealth.version, '1.0.0');

  // SSE endpoint without auth (expect 401 Unauthorized)
  const resUnauth = await fetch('http://127.0.0.1:3995/sse');
  assert.strictEqual(resUnauth.status, 401);
  const dataUnauth = await resUnauth.json();
  assert.strictEqual(dataUnauth.error, 'Unauthorized');

  // SSE endpoint with invalid Bearer token (expect 401)
  const resWrong = await fetch('http://127.0.0.1:3995/sse', {
    headers: { Authorization: 'Bearer wrong_token' },
  });
  assert.strictEqual(resWrong.status, 401);

  // SSE endpoint with valid Bearer token (expect 200 text/event-stream)
  const controller = new AbortController();
  const resAuth = await fetch('http://127.0.0.1:3995/sse', {
    headers: { Authorization: 'Bearer test_secret_docker_token_666' },
    signal: controller.signal,
  });
  assert.strictEqual(resAuth.status, 200);
  assert.strictEqual(resAuth.headers.get('content-type'), 'text/event-stream');

  controller.abort();
});
