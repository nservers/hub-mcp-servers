import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { PlatformClient } from '../dist/platform/client.js';

const GOOD_PAT = 'pat_test_valid_123';

function startStubApi() {
  const requests = [];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://stub');
    requests.push({ method: req.method, path: url.pathname, headers: req.headers });
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/api/v1/me') {
      if (req.headers.authorization !== `Bearer ${GOOD_PAT}`) {
        return json(401, { error: { message: 'Unauthenticated.' } });
      }
      return json(200, {
        user: { id: 7, email: 'agent@nservers.io' },
        abilities: ['vps:read', 'vps:control'],
      });
    }
    if (url.pathname === '/api/v1/health') return json(200, { ok: true });
    if (url.pathname === '/api/v1/vps') return json(200, { data: [{ id: 9 }] });
    if (url.pathname === '/api/v1/vps/9/actions/restart' && req.method === 'POST') {
      return json(403, { error: { message: 'Step-up verification required.' } });
    }
    json(404, { error: { message: 'Not found.' } });
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port, requests })
    );
  });
}

function makeClient(port, pat = GOOD_PAT, maxCallsPerHour = 500) {
  const config = {
    apiUrl: `http://127.0.0.1:${port}`,
    organizationId: undefined,
    mcpAuthToken: undefined,
    portHttp: 3000,
    hostHttp: '127.0.0.1',
    timeoutMs: 5000,
    maxCallsPerHour,
  };
  const session = {
    pat,
    abilities: [],
    userLabel: 'unknown',
    callsThisHour: 0,
    windowStartedAt: Date.now(),
  };
  return new PlatformClient(config, session);
}

test('me() validates the PAT and caches token abilities', async (t) => {
  const { server, port } = await startStubApi();
  t.after(() => server.close());

  const client = makeClient(port);
  const me = await client.me();
  assert.deepStrictEqual(me.abilities, ['vps:read', 'vps:control']);
  assert.strictEqual(me.userLabel, 'agent@nservers.io');
  assert.deepStrictEqual(client.abilities, ['vps:read', 'vps:control']);
});

test('me() surfaces unauthorized for a revoked/invalid PAT', async (t) => {
  const { server, port } = await startStubApi();
  t.after(() => server.close());

  const client = makeClient(port, 'pat_test_revoked');
  await assert.rejects(() => client.me(), (err) => {
    assert.strictEqual(err.kind, 'unauthorized');
    return true;
  });
});

test('step-up 403 is classified as approval_required', async (t) => {
  const { server, port } = await startStubApi();
  t.after(() => server.close());

  const client = makeClient(port);
  await assert.rejects(
    () => client.fetchApi('/api/v1/vps/9/actions/restart', { method: 'POST' }),
    (err) => {
      assert.strictEqual(err.kind, 'approval_required');
      assert.match(err.message, /step-up/i);
      return true;
    }
  );
});

test('mutating calls send an Idempotency-Key and X-Step-Up-Token when provided', async (t) => {
  const { server, port, requests } = await startStubApi();
  t.after(() => server.close());

  const client = makeClient(port);
  await client
    .fetchApi('/api/v1/vps/9/actions/restart', { method: 'POST', stepUpToken: 'sutoken_1234567890' })
    .catch(() => {});

  const write = requests.find((r) => r.method === 'POST');
  assert.ok(write, 'expected a POST to be recorded');
  assert.match(write.headers['idempotency-key'], /^mcp-/);
  assert.strictEqual(write.headers['x-step-up-token'], 'sutoken_1234567890');
});

test('hourly call budget blocks calls once exhausted', async (t) => {
  const { server, port } = await startStubApi();
  t.after(() => server.close());

  const client = makeClient(port, GOOD_PAT, 2);
  await client.fetchApi('/api/v1/vps');
  await client.fetchApi('/api/v1/vps');
  await assert.rejects(() => client.fetchApi('/api/v1/vps'), (err) => {
    assert.strictEqual(err.kind, 'rate_limited');
    assert.match(err.message, /budget exhausted/i);
    return true;
  });
});
