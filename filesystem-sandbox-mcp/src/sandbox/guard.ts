import path from 'node:path';
import fs from 'node:fs';

export class SandboxViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxViolationError';
  }
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

  // Format with consistent forward slashes for cross-platform comparison
  const normalizedRoot = canonicalRoot.split(path.sep).join('/');
  const normalizedCandidate = candidatePath.split(path.sep).join('/');

  // Verify candidate is exactly root or inside root
  const isInside =
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}/`);

  if (!isInside) {
    throw new SandboxViolationError(
      `Directory traversal attempt blocked. Path '${requestedPath}' escapes sandbox root '${sandboxRoot}'.`
    );
  }

  // Verify realpath against symlink breakout if target exists
  if (fs.existsSync(candidatePath)) {
    const realCandidate = fs.realpathSync(candidatePath);
    const realRoot = fs.existsSync(canonicalRoot) ? fs.realpathSync(canonicalRoot) : canonicalRoot;

    const normalizedRealRoot = realRoot.split(path.sep).join('/');
    const normalizedRealCandidate = realCandidate.split(path.sep).join('/');

    const isRealInside =
      normalizedRealCandidate === normalizedRealRoot ||
      normalizedRealCandidate.startsWith(`${normalizedRealRoot}/`);

    if (!isRealInside) {
      throw new SandboxViolationError(
        `Symlink boundary violation blocked. Real path '${realCandidate}' is outside sandbox.`
      );
    }

    return realCandidate;
  }

  return candidatePath;
}
