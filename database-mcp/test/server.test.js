import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

test('server boots up, responds to healthcheck, and enforces Bearer token on /sse', async (t) => {
  const env = {
    ...process.env,
    PORT: '3999',
    HOST: '127.0.0.1',
    DB_HOST: '127.0.0.1',
    DB_PORT: '5432',
    DB_DATABASE: 'test_db',
    DB_USERNAME: 'test_user',
    DB_PASSWORD: 'test_password',
    MCP_AUTH_TOKEN: 'nai_integration_test_secret_token_123',
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
  const resHealth = await fetch('http://127.0.0.1:3999/health');
  assert.strictEqual(resHealth.status, 503);
  const dataHealth = await resHealth.json();
  assert.strictEqual(dataHealth.service, 'database-mcp');
  assert.strictEqual(dataHealth.version, '1.0.0');

  // SSE endpoint without auth (expect 401 Unauthorized)
  const resUnauth = await fetch('http://127.0.0.1:3999/sse');
  assert.strictEqual(resUnauth.status, 401);
  const dataUnauth = await resUnauth.json();
  assert.strictEqual(dataUnauth.error, 'Unauthorized');

  // SSE endpoint with invalid Bearer token (expect 401)
  const resWrong = await fetch('http://127.0.0.1:3999/sse', {
    headers: { Authorization: 'Bearer invalid_token' },
  });
  assert.strictEqual(resWrong.status, 401);

  // SSE endpoint with valid Bearer token (expect 200 text/event-stream)
  const controller = new AbortController();
  const resAuth = await fetch('http://127.0.0.1:3999/sse', {
    headers: { Authorization: 'Bearer nai_integration_test_secret_token_123' },
    signal: controller.signal,
  });
  assert.strictEqual(resAuth.status, 200);
  assert.strictEqual(resAuth.headers.get('content-type'), 'text/event-stream');

  controller.abort();
});
