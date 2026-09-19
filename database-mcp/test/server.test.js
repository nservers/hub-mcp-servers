import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

test('servidor inicia, responde ao healthcheck e exige Bearer token no /sse', async (t) => {
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

  // Aguarda inicialização do servidor
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 1. Testa /health
  const resHealth = await fetch('http://127.0.0.1:3999/health');
  assert.strictEqual(resHealth.status, 503); // 503 porque o banco local de teste não está ativo, mas o servidor HTTP respondeu perfeitamente
  const dataHealth = await resHealth.json();
  assert.strictEqual(dataHealth.service, 'database-mcp');
  assert.strictEqual(dataHealth.version, '1.0.0');

  // 2. Testa /sse sem autenticação (deve retornar 401 Unauthorized)
  const resUnauth = await fetch('http://127.0.0.1:3999/sse');
  assert.strictEqual(resUnauth.status, 401);
  const dataUnauth = await resUnauth.json();
  assert.strictEqual(dataUnauth.error, 'Unauthorized');

  // 3. Testa /sse com token inválido (deve retornar 401)
  const resWrong = await fetch('http://127.0.0.1:3999/sse', {
    headers: { Authorization: 'Bearer token_incorreto' },
  });
  assert.strictEqual(resWrong.status, 401);

  // 4. Testa /sse com token válido
  const controller = new AbortController();
  const resAuth = await fetch('http://127.0.0.1:3999/sse', {
    headers: { Authorization: 'Bearer nai_integration_test_secret_token_123' },
    signal: controller.signal,
  });
  assert.strictEqual(resAuth.status, 200);
  assert.strictEqual(resAuth.headers.get('content-type'), 'text/event-stream');

  controller.abort();
});
