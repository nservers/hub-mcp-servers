import test from 'node:test';
import assert from 'node:assert';
import { validateSafeRedisCommand, ReadOnlyViolationError } from '../dist/redis/guard.js';

test('guard permits valid read-only Redis commands', () => {
  const allowed = ['GET', 'get', 'HGETALL', 'hgetall', 'LRANGE', 'smembers', 'zrange', 'TTL', 'SCAN', 'INFO'];
  for (const cmd of allowed) {
    const validated = validateSafeRedisCommand(cmd);
    assert.strictEqual(validated, cmd.toUpperCase());
  }
});

test('guard rejects destructive and mutating Redis commands', () => {
  const forbidden = [
    'FLUSHALL',
    'flushall',
    'FLUSHDB',
    'DEL',
    'unlink',
    'CONFIG',
    'shutdown',
    'SET',
    'set',
    'HSET',
    'LPUSH',
    'SADD',
    'ZADD',
    'EXPIRE',
    'EVAL',
    'DEBUG',
  ];

  for (const cmd of forbidden) {
    assert.throws(
      () => validateSafeRedisCommand(cmd),
      ReadOnlyViolationError,
      `Expected '${cmd}' to be blocked by guard`
    );
  }
});

test('guard rejects empty or invalid command values', () => {
  assert.throws(() => validateSafeRedisCommand(''), ReadOnlyViolationError);
  assert.throws(() => validateSafeRedisCommand('   '), ReadOnlyViolationError);
});
