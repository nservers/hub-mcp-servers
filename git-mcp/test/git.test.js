import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { GitClientWrapper } from '../dist/git/client.js';

test('GitClientWrapper detects repository and retrieves status and branches', async () => {
  const client = new GitClientWrapper({
    repoPath: path.resolve(process.cwd(), '..'),
    portHttp: 3000,
    hostHttp: '0.0.0.0',
  });

  const connection = await client.testConnection();
  assert.strictEqual(connection.ok, true);
  assert.strictEqual(connection.isRepo, true);

  const status = await client.getStatus();
  assert.ok(typeof status.current === 'string');

  const branches = await client.getBranches();
  assert.ok(Array.isArray(branches.all));
  assert.ok(branches.all.length > 0);

  const log = await client.getLog(5);
  assert.ok(Array.isArray(log.all));
  assert.ok(log.all.length > 0);
});
