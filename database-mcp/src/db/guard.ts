export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyViolationError';
  }
}

const FORBIDDEN_KEYWORDS = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'TRUNCATE',
  'ALTER',
  'CREATE',
  'REPLACE',
  'GRANT',
  'REVOKE',
  'LOCK',
  'EXEC',
  'EXECUTE',
  'CALL',
  'FLUSH',
  'RENAME',
  'SET',
];

const ALLOWED_INITIAL_VERBS = [
  'SELECT',
  'EXPLAIN',
  'WITH',
  'SHOW',
  'DESCRIBE',
  'DESC',
];

export function validateReadOnlyQuery(rawSql: string): string {
  if (!rawSql || typeof rawSql !== 'string') {
    throw new ReadOnlyViolationError('SQL query cannot be empty.');
  }

  // Strip SQL comments to prevent obfuscation
  const cleanedSql = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!cleanedSql) {
    throw new ReadOnlyViolationError('SQL query does not contain executable code.');
  }

  // Disallow multi-statement queries
  const statements = cleanedSql
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
      `Operation '${initialVerb}' is not allowed. This MCP server strictly operates in read-only mode (${ALLOWED_INITIAL_VERBS.join(', ')}).`
    );
  }

  const upperSql = singleQuery.toUpperCase();
  for (const forbidden of FORBIDDEN_KEYWORDS) {
    // Use word boundaries so column names like updated_at or created_by are not blocked
    const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
    if (regex.test(upperSql)) {
      throw new ReadOnlyViolationError(
        `Forbidden mutation keyword detected ('${forbidden}'). Access is strictly read-only.`
      );
    }
  }

  return singleQuery;
}
