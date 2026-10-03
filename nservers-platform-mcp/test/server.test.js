import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { spawn } from 'node:child_process';

const GOOD_PAT = 'pat_test_valid_123';

function startStubApi() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://stub');
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/api/v1/health') return json(200, { ok: true });
    if (url.pathname === '/api/v1/me') {
      if (req.headers.authorization !== `Bearer ${GOOD_PAT}`) {
        return json(401, { error: { message: 'Unauthenticated.' } });
      }
      return json(200, {
        user: { id: 7, email: 'agent@nservers.io' },
        abilities: ['vps:read'],
      });
    }
    json(404, { error: { message: 'Not found.' } });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

test('nservers-platform-mcp enforces PAT auth on /sse and exposes /health', async (t) => {
  const { server: api, port: apiPort } = await startStubApi();
  t.after(() => api.close());

  const proc = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3995',
      HOST: '127.0.0.1',
      NSERVERS_API_URL: `http://127.0.0.1:${apiPort}`,
    },
    stdio: 'pipe',
  });
  t.after(() => proc.kill());

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const resHealth = await fetch('http://127.0.0.1:3995/health');
  assert.strictEqual(resHealth.status, 200);
  const dataHealth = await resHealth.json();
  assert.strictEqual(dataHealth.service, 'nservers-platform-mcp');
  assert.strictEqual(dataHealth.status, 'healthy');

  const resUnauth = await fetch('http://127.0.0.1:3995/sse');
  assert.strictEqual(resUnauth.status, 401);

  const resBadPat = await fetch('http://127.0.0.1:3995/sse', {
    headers: { Authorization: 'Bearer pat_test_revoked' },
  });
  assert.strictEqual(resBadPat.status, 401);

  const controller = new AbortController();
  const resAuth = await fetch('http://127.0.0.1:3995/sse', {
    headers: { Authorization: `Bearer ${GOOD_PAT}` },
    signal: controller.signal,
  });
  assert.strictEqual(resAuth.status, 200);
  assert.strictEqual(resAuth.headers.get('content-type'), 'text/event-stream');
  controller.abort();
});

test('optional MCP_AUTH_TOKEN gate rejects connections without X-MCP-Auth', async (t) => {
  const { server: api, port: apiPort } = await startStubApi();
  t.after(() => api.close());

  const proc = spawn('node', ['dist/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '3994',
      HOST: '127.0.0.1',
      NSERVERS_API_URL: `http://127.0.0.1:${apiPort}`,
      MCP_AUTH_TOKEN: 'gate_secret_abc',
    },
    stdio: 'pipe',
  });
  t.after(() => proc.kill());

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const resNoGate = await fetch('http://127.0.0.1:3994/sse', {
    headers: { Authorization: `Bearer ${GOOD_PAT}` },
  });
  assert.strictEqual(resNoGate.status, 401);

  const controller = new AbortController();
  const resGated = await fetch('http://127.0.0.1:3994/sse', {
    headers: { Authorization: `Bearer ${GOOD_PAT}`, 'X-MCP-Auth': 'gate_secret_abc' },
    signal: controller.signal,
  });
  assert.strictEqual(resGated.status, 200);
  controller.abort();
});
