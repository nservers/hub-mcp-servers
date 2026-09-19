import test from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { resolveSecureSandboxPath, SandboxViolationError } from '../dist/sandbox/guard.js';

test('resolveSecureSandboxPath allows paths strictly inside sandbox', () => {
  const root = path.resolve(process.cwd(), 'temp_sandbox_test');
  const safe = resolveSecureSandboxPath(root, 'sub/file.txt');
  const normalizedRoot = root.split(path.sep).join('/');
  const normalizedSafe = safe.split(path.sep).join('/');
  assert.ok(normalizedSafe.startsWith(`${normalizedRoot}/`));
});

test('resolveSecureSandboxPath blocks directory traversal attempts', () => {
  const root = path.resolve(process.cwd(), 'temp_sandbox_test');
  const attacks = [
    '../escape.txt',
    '../../etc/passwd',
    '..\\..\\windows\\system32',
    'sub/../../outside.txt',
  ];

  for (const attack of attacks) {
    assert.throws(
      () => resolveSecureSandboxPath(root, attack),
      SandboxViolationError,
      `Expected traversal attack '${attack}' to be rejected`
    );
  }
});

test('resolveSecureSandboxPath rejects null bytes', () => {
  const root = path.resolve(process.cwd(), 'temp_sandbox_test');
  assert.throws(
    () => resolveSecureSandboxPath(root, 'file.txt\0.png'),
    SandboxViolationError
  );
});
