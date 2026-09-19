import test from 'node:test';
import assert from 'node:assert';
import { validateReadOnlySqliteQuery, ReadOnlyViolationError } from '../dist/sqlite/guard.js';

test('guard permits valid read-only SQLite queries and inspection pragmas', () => {
  const allowed = [
    'SELECT 1',
    'select id, name from users limit 10',
    'EXPLAIN QUERY PLAN SELECT * FROM orders',
    'WITH cte AS (SELECT 1) SELECT * FROM cte',
    'PRAGMA table_info("users")',
    'pragma compile_options',
    'PRAGMA database_list',
  ];

  for (const sql of allowed) {
    const validated = validateReadOnlySqliteQuery(sql);
    assert.ok(validated.length > 0);
  }
});

test('guard rejects destructive and mutating SQLite statements', () => {
  const forbidden = [
    'DROP TABLE users',
    'DELETE FROM users WHERE 1=1',
    'UPDATE users SET role = "admin"',
    'INSERT INTO users (name) VALUES ("attacker")',
    'ALTER TABLE users ADD COLUMN secret text',
    'CREATE TABLE evil (id int)',
    'ATTACH DATABASE "/etc/passwd" AS evil',
    'PRAGMA writable_schema = ON',
    'PRAGMA foreign_keys = OFF',
  ];

  for (const sql of forbidden) {
    assert.throws(
      () => validateReadOnlySqliteQuery(sql),
      ReadOnlyViolationError,
      `Expected '${sql}' to be blocked by guard`
    );
  }
});

test('guard rejects multi-statement chaining', () => {
  assert.throws(
    () => validateReadOnlySqliteQuery('SELECT 1; DROP TABLE users;'),
    ReadOnlyViolationError
  );
});

test('guard rejects empty input', () => {
  assert.throws(() => validateReadOnlySqliteQuery(''), ReadOnlyViolationError);
  assert.throws(() => validateReadOnlySqliteQuery('-- only comments'), ReadOnlyViolationError);
});
