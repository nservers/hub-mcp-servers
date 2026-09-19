export class ReadOnlyViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReadOnlyViolationError';
  }
}

const ALLOWED_READ_COMMANDS = new Set([
  'GET',
  'MGET',
  'STRLEN',
  'GETRANGE',
  'HGET',
  'HMGET',
  'HGETALL',
  'HKEYS',
  'HVALS',
  'HLEN',
  'HEXISTS',
  'LRANGE',
  'LLEN',
  'LINDEX',
  'LPOS',
  'SMEMBERS',
  'SCARD',
  'SISMEMBER',
  'SMISMEMBER',
  'SRANDMEMBER',
  'ZRANGE',
  'ZREVRANGE',
  'ZCARD',
  'ZSCORE',
  'ZRANK',
  'ZREVRANK',
  'ZCOUNT',
  'XLEN',
  'XRANGE',
  'XREVRANGE',
  'TTL',
  'PTTL',
  'TYPE',
  'EXISTS',
  'DUMP',
  'SCAN',
  'HSCAN',
  'SSCAN',
  'ZSCAN',
  'INFO',
  'PING',
  'TIME',
  'DBSIZE',
]);

const FORBIDDEN_WRITE_COMMANDS = new Set([
  'FLUSHALL',
  'FLUSHDB',
  'DEL',
  'UNLINK',
  'CONFIG',
  'SHUTDOWN',
  'SAVE',
  'BGSAVE',
  'SET',
  'SETNX',
  'SETEX',
  'PSETEX',
  'MSET',
  'MSETNX',
  'APPEND',
  'INCR',
  'DECR',
  'INCRBY',
  'DECRBY',
  'HSET',
  'HSETNX',
  'HMSET',
  'HDEL',
  'LPUSH',
  'RPUSH',
  'LPOP',
  'RPOP',
  'SADD',
  'SREM',
  'SPOP',
  'ZADD',
  'ZREM',
  'EXPIRE',
  'PEXPIRE',
  'PERSIST',
  'RENAME',
  'RENAMENX',
  'EVAL',
  'EVALSHA',
  'SCRIPT',
  'FUNCTION',
  'MODULE',
  'ACL',
  'AUTH',
  'CLIENT',
  'DEBUG',
]);

export function validateSafeRedisCommand(commandName: string): string {
  if (!commandName || typeof commandName !== 'string') {
    throw new ReadOnlyViolationError('Command name cannot be empty.');
  }

  const normalized = commandName.trim().toUpperCase();

  if (FORBIDDEN_WRITE_COMMANDS.has(normalized)) {
    throw new ReadOnlyViolationError(
      `Forbidden command '${normalized}'. Mutating or administrative operations are strictly blocked by safety guards.`
    );
  }

  if (!ALLOWED_READ_COMMANDS.has(normalized)) {
    throw new ReadOnlyViolationError(
      `Command '${normalized}' is not in the permitted read-only whitelist.`
    );
  }

  return normalized;
}
