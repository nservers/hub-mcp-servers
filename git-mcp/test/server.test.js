import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { spawn } from 'node:child_process';

test('git-mcp boots up, responds to healthcheck with 200, and enforces Bearer auth on /sse', async (t) => {
  const env = {
    ...process.env,
    PORT: '3994',
    HOST: '127.0.0.1',
    REPOSITORY_PATH: path.resolve(process.cwd(), '..'),
    MCP_AUTH_TOKEN: 'test_secret_git_token_555',
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
  const resHealth = await fetch('http://127.0.0.1:3994/health');
  assert.strictEqual(resHealth.status, 200);
  const dataHealth = await resHealth.json();
  assert.strictEqual(dataHealth.service, 'git-mcp');
  assert.strictEqual(dataHealth.version, '1.0.0');
  assert.strictEqual(dataHealth.status, 'healthy');

  // SSE endpoint without auth (expect 401 Unauthorized)
  const resUnauth = await fetch('http://127.0.0.1:3994/sse');
  assert.strictEqual(resUnauth.status, 401);
  const dataUnauth = await resUnauth.json();
  assert.strictEqual(dataUnauth.error, 'Unauthorized');

  // SSE endpoint with invalid Bearer token (expect 401)
  const resWrong = await fetch('http://127.0.0.1:3994/sse', {
    headers: { Authorization: 'Bearer wrong_token' },
  });
  assert.strictEqual(resWrong.status, 401);

  // SSE endpoint with valid Bearer token (expect 200 text/event-stream)
  const controller = new AbortController();
  const resAuth = await fetch('http://127.0.0.1:3994/sse', {
    headers: { Authorization: 'Bearer test_secret_git_token_555' },
    signal: controller.signal,
  });
  assert.strictEqual(resAuth.status, 200);
  assert.strictEqual(resAuth.headers.get('content-type'), 'text/event-stream');

  controller.abort();
});
