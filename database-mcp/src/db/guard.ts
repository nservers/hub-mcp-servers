/**
 * Guarda de Segurança SQL: Assegura execução estritamente Read-Only em bancos de dados.
 */

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
    throw new ReadOnlyViolationError('A instrução SQL não pode ser vazia.');
  }

  // 1. Remove comentários SQL (-- e /* ... */) para evitar ofuscação
  const cleanedSql = rawSql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!cleanedSql) {
    throw new ReadOnlyViolationError('A instrução SQL não contém código executável.');
  }

  // 2. Previne SQL injection com múltiplas queries encadeadas por ponto-e-vírgula (ex: SELECT 1; DROP TABLE ...)
  const statements = cleanedSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (statements.length > 1) {
    throw new ReadOnlyViolationError(
      'Múltiplas instruções encadeadas por ponto-e-vírgula (;) são proibidas por segurança.'
    );
  }

  const singleQuery = statements[0];

  // 3. Extrai o primeiro verbo e valida se é de leitura declarativa
  const matchFirstWord = singleQuery.match(/^([a-zA-Z]+)/);
  if (!matchFirstWord) {
    throw new ReadOnlyViolationError('Sintaxe SQL inválida.');
  }

  const initialVerb = matchFirstWord[1].toUpperCase();
  if (!ALLOWED_INITIAL_VERBS.includes(initialVerb)) {
    throw new ReadOnlyViolationError(
      `Operação '${initialVerb}' não permitida. Este conector MCP opera estritamente em modo Read-Only (${ALLOWED_INITIAL_VERBS.join(', ')}).`
    );
  }

  // 4. Varre todas as palavras-chave proibidas em busca de comandos de mutação
  const upperSql = singleQuery.toUpperCase();
  for (const forbidden of FORBIDDEN_KEYWORDS) {
    // Regex com word boundary (\b) para não bloquear colunas que contêm o termo (ex: created_at, update_count)
    const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
    if (regex.test(upperSql)) {
      throw new ReadOnlyViolationError(
        `Comando de modificação proibido detectado ('${forbidden}'). Acesso restrito a leitura.`
      );
    }
  }

  return singleQuery;
}
