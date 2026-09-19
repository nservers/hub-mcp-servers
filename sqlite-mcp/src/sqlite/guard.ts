export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyViolationError';
  }
}

const ALLOWED_INITIAL_VERBS = [
  'SELECT',
  'EXPLAIN',
  'WITH',
  'PRAGMA',
];

const ALLOWED_READ_PRAGMAS = new Set([
  'TABLE_INFO',
  'TABLE_XINFO',
  'COMPILE_OPTIONS',
  'FOREIGN_KEY_LIST',
  'INDEX_LIST',
  'INDEX_INFO',
  'INDEX_XINFO',
  'DATABASE_LIST',
  'SCHEMA_VERSION',
  'USER_VERSION',
  'INTEGRITY_CHECK',
  'QUICK_CHECK',
  'STATS',
  'PAGE_COUNT',
  'PAGE_SIZE',
  'MAX_PAGE_COUNT',
  'ENCODING',
]);

const FORBIDDEN_KEYWORDS = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'REPLACE',
  'ATTACH',
  'DETACH',
  'REINDEX',
  'VACUUM',
  'LOCK',
  'TRANSACTION',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'RELEASE',
];

export function validateReadOnlySqliteQuery(rawSql: string): string {
  if (!rawSql || typeof rawSql !== 'string') {
    throw new ReadOnlyViolationError('SQL query cannot be empty.');
  }

  // Strip comments to prevent hiding mutating payloads
  const cleaned = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!cleaned) {
    throw new ReadOnlyViolationError('SQL query does not contain executable code.');
  }

  // Disallow semicolon-chained multi-statements
  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    throw new ReadOnlyViolationError(
      'Multiple semicolon-separated statements are forbidden for security reasons.'
    );
  }

  const singleQuery = statements[0];
  const matchFirstWord = singleQuery.match(/^([a-zA-Z]+)/);
  if (!matchFirstWord) {
    throw new ReadOnlyViolationError('Invalid SQL syntax.');
  }

  const initialVerb = matchFirstWord[1].toUpperCase();
  if (!ALLOWED_INITIAL_VERBS.includes(initialVerb)) {
    throw new ReadOnlyViolationError(
      `Operation '${initialVerb}' is not allowed. sqlite-mcp operates strictly in read-only mode (${ALLOWED_INITIAL_VERBS.join(', ')}).`
    );
  }

  // If PRAGMA, ensure only read-only PRAGMAs are executed
  if (initialVerb === 'PRAGMA') {
    const pragmaMatch = singleQuery.match(/^PRAGMA\s+([a-zA-Z_]+)/i);
    if (!pragmaMatch) {
      throw new ReadOnlyViolationError('Invalid PRAGMA statement.');
    }
    const pragmaName = pragmaMatch[1].toUpperCase();
    if (!ALLOWED_READ_PRAGMAS.has(pragmaName)) {
      throw new ReadOnlyViolationError(
        `PRAGMA '${pragmaName}' is blocked. Only inspection PRAGMAs are permitted.`
      );
    }
    // Block assignment PRAGMAs (e.g. PRAGMA foreign_keys = OFF)
    if (singleQuery.includes('=')) {
      throw new ReadOnlyViolationError('PRAGMA assignment mutations are forbidden.');
    }
  }

  const upperSql = singleQuery.toUpperCase();
  for (const forbidden of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
    if (regex.test(upperSql)) {
      throw new ReadOnlyViolationError(
        `Forbidden mutation keyword detected ('${forbidden}'). Access is strictly read-only.`
      );
    }
  }

  return singleQuery;
}
