import test from 'node:test';
import assert from 'node:assert';
import { validateReadOnlyQuery, ReadOnlyViolationError } from '../dist/db/guard.js';

test('permite consultas SELECT declarativas normais', () => {
  const sql = 'SELECT id, email, name FROM users WHERE active = true';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('permite EXPLAIN e EXPLAIN ANALYZE', () => {
  const sql = 'EXPLAIN ANALYZE SELECT * FROM orders WHERE total > 100';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('permite WITH (Common Table Expressions - CTE)', () => {
  const sql = 'WITH active_users AS (SELECT id FROM users WHERE active = 1) SELECT * FROM active_users';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('permite SHOW e DESCRIBE', () => {
  assert.strictEqual(validateReadOnlyQuery('SHOW TABLES'), 'SHOW TABLES');
  assert.strictEqual(validateReadOnlyQuery('DESCRIBE users'), 'DESCRIBE users');
});

test('permite colunas cujo nome contenha palavras de mutação (ex: updated_at, created_by)', () => {
  const sql = 'SELECT id, created_at, updated_at, deleted_at FROM accounts';
  const result = validateReadOnlyQuery(sql);
  assert.strictEqual(result, sql);
});

test('bloqueia DROP TABLE', () => {
  assert.throws(
    () => validateReadOnlyQuery('DROP TABLE users'),
    ReadOnlyViolationError
  );
});

test('bloqueia DELETE FROM', () => {
  assert.throws(
    () => validateReadOnlyQuery('DELETE FROM users WHERE id = 5'),
    ReadOnlyViolationError
  );
});

test('bloqueia UPDATE', () => {
  assert.throws(
    () => validateReadOnlyQuery('UPDATE users SET name = "Hacked" WHERE id = 1'),
    ReadOnlyViolationError
  );
});

test('bloqueia INSERT INTO', () => {
  assert.throws(
    () => validateReadOnlyQuery('INSERT INTO users (name) VALUES ("Injected")'),
    ReadOnlyViolationError
  );
});

test('bloqueia TRUNCATE', () => {
  assert.throws(
    () => validateReadOnlyQuery('TRUNCATE TABLE users'),
    ReadOnlyViolationError
  );
});

test('bloqueia ALTER TABLE', () => {
  assert.throws(
    () => validateReadOnlyQuery('ALTER TABLE users ADD COLUMN compromised INT'),
    ReadOnlyViolationError
  );
});

test('bloqueia múltiplas instruções encadeadas por ponto-e-vírgula', () => {
  assert.throws(
    () => validateReadOnlyQuery('SELECT 1; DROP TABLE users;'),
    ReadOnlyViolationError
  );
});

test('bloqueia comandos destrutivos escondidos atrás de comentários SQL', () => {
  assert.throws(
    () => validateReadOnlyQuery('/* Safe query comment */ DROP TABLE users;'),
    ReadOnlyViolationError
  );
  assert.throws(
    () => validateReadOnlyQuery('-- bypass\nDELETE FROM users;'),
    ReadOnlyViolationError
  );
});
