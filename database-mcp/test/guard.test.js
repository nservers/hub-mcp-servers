import test from 'node:test';
import assert from 'node:assert';
import { validateReadOnlyQuery, ReadOnlyViolationError } from '../dist/db/guard.js';

test('allows standard declarative SELECT queries', () => {
  const sql = 'SELECT id, email, name FROM users WHERE active = true';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('allows EXPLAIN and EXPLAIN ANALYZE', () => {
  const sql = 'EXPLAIN ANALYZE SELECT * FROM orders WHERE total > 100';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('allows WITH (Common Table Expressions - CTE)', () => {
  const sql = 'WITH active_users AS (SELECT id FROM users WHERE active = 1) SELECT * FROM active_users';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('allows SHOW and DESCRIBE', () => {
  assert.strictEqual(validateReadOnlyQuery('SHOW TABLES'), 'SHOW TABLES');
  assert.strictEqual(validateReadOnlyQuery('DESCRIBE users'), 'DESCRIBE users');
});

test('allows columns with names containing mutation keywords (e.g. updated_at, created_by)', () => {
  const sql = 'SELECT id, created_at, updated_at, deleted_at FROM accounts';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('blocks DROP TABLE', () => {
  assert.throws(
    () => validateReadOnlyQuery('DROP TABLE users'),
    ReadOnlyViolationError
  );
});

test('blocks DELETE FROM', () => {
  assert.throws(
    () => validateReadOnlyQuery('DELETE FROM users WHERE id = 5'),
    ReadOnlyViolationError
  );
});

test('blocks UPDATE', () => {
  assert.throws(
    () => validateReadOnlyQuery('UPDATE users SET name = "Hacked" WHERE id = 1'),
    ReadOnlyViolationError
  );
});

test('blocks INSERT INTO', () => {
  assert.throws(
    () => validateReadOnlyQuery('INSERT INTO users (name) VALUES ("Injected")'),
    ReadOnlyViolationError
  );
});

test('blocks TRUNCATE', () => {
  assert.throws(
    () => validateReadOnlyQuery('TRUNCATE TABLE users'),
    ReadOnlyViolationError
  );
});

test('blocks ALTER TABLE', () => {
  assert.throws(
    () => validateReadOnlyQuery('ALTER TABLE users ADD COLUMN compromised INT'),
    ReadOnlyViolationError
  );
});

test('blocks multiple semicolon-separated statements', () => {
  assert.throws(
    () => validateReadOnlyQuery('SELECT 1; DROP TABLE users;'),
    ReadOnlyViolationError
  );
});

test('blocks destructive commands disguised behind SQL comments', () => {
  assert.throws(
    () => validateReadOnlyQuery('/* Safe query comment */ DROP TABLE users;'),
    ReadOnlyViolationError
  );
  assert.throws(
    () => validateReadOnlyQuery('-- bypass\nDELETE FROM users;'),
    ReadOnlyViolationError
  );
});
