import path from 'node:path';
import fs from 'node:fs';

export class SandboxViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxViolationError';
  }
}

function isPathContained(root: string, candidate: string): boolean {
  const rel = path.relative(root, candidate);
  if (rel === '' || rel === '.') {
    return true;
  }
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return false;
  }
  const isWin = process.platform === 'win32';
  const normRoot = isWin ? path.resolve(root).toLowerCase() : path.resolve(root);
  const normCandidate = isWin ? path.resolve(candidate).toLowerCase() : path.resolve(candidate);
  const sep = path.sep;
  return normCandidate === normRoot || normCandidate.startsWith(`${normRoot}${sep}`) || normCandidate.startsWith(`${normRoot}/`);
}

export function resolveSecureSandboxPath(sandboxRoot: string, requestedPath: string = '.'): string {
  if (typeof requestedPath !== 'string') {
    throw new SandboxViolationError('Requested path must be a string.');
  }

  // Detect null byte poisoning
  if (requestedPath.includes('\0')) {
    throw new SandboxViolationError('Null bytes detected in path.');
  }

  // Canonicalize sandbox root
  const canonicalRoot = path.resolve(sandboxRoot);

  // Strip leading slashes to keep resolution relative to sandbox root
  const sanitizedInput = requestedPath.replace(/^[/\\]+/, '');

  // Resolve target against root
  const candidatePath = path.resolve(canonicalRoot, sanitizedInput);

  if (!isPathContained(canonicalRoot, candidatePath)) {
    throw new SandboxViolationError(
      `Directory traversal attempt blocked. Path '${requestedPath}' escapes sandbox root '${sandboxRoot}'.`
    );
  }

  // Verify realpath against symlink breakout if target exists
  if (fs.existsSync(candidatePath)) {
    const realCandidate = fs.realpathSync(candidatePath);
    const realRoot = fs.existsSync(canonicalRoot) ? fs.realpathSync(canonicalRoot) : canonicalRoot;

    if (!isPathContained(realRoot, realCandidate)) {
      throw new SandboxViolationError(
        `Symlink boundary violation blocked. Real path '${realCandidate}' is outside sandbox.`
      );
    }

    return realCandidate;
  }

  return candidatePath;
}
