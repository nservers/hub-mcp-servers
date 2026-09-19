import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { AppConfig } from '../config.js';
import { resolveSecureSandboxPath } from './guard.js';

export interface FileEntry {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  sizeBytes: number;
  modifiedAt: string;
}

export class SandboxedFs {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    if (!fsSync.existsSync(config.sandboxRoot)) {
      fsSync.mkdirSync(config.sandboxRoot, { recursive: true });
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string; sandboxRoot: string }> {
    const start = performance.now();
    try {
      await fs.access(this.config.sandboxRoot);
      const latencyMs = Math.round(performance.now() - start);
      return { ok: true, latencyMs, sandboxRoot: this.config.sandboxRoot };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error), sandboxRoot: this.config.sandboxRoot };
    }
  }

  async listDirectory(subPath: string = '.'): Promise<FileEntry[]> {
    const securePath = resolveSecureSandboxPath(this.config.sandboxRoot, subPath);
    const dirEntries = await fs.readdir(securePath, { withFileTypes: true });

    const results: FileEntry[] = [];
    for (const entry of dirEntries) {
      const fullEntryPath = path.join(securePath, entry.name);
      const relToRoot = path.relative(this.config.sandboxRoot, fullEntryPath).split(path.sep).join('/');
      let sizeBytes = 0;
      let modifiedAt = new Date().toISOString();

      try {
        const stat = await fs.stat(fullEntryPath);
        sizeBytes = stat.size;
        modifiedAt = stat.mtime.toISOString();
      } catch {
        // Fallback
      }

      results.push({
        name: entry.name,
        relativePath: relToRoot,
        isDirectory: entry.isDirectory(),
        sizeBytes,
        modifiedAt,
      });
    }

    return results;
  }

  async readFile(subPath: string, startLine?: number, endLine?: number): Promise<{ content: string; totalLines: number; truncated: boolean }> {
    const securePath = resolveSecureSandboxPath(this.config.sandboxRoot, subPath);
    const stat = await fs.stat(securePath);

    if (stat.isDirectory()) {
      throw new Error(`Path '${subPath}' is a directory, not a readable file.`);
    }

    if (stat.size > this.config.maxReadBytes) {
      throw new Error(`File size (${stat.size} bytes) exceeds the maximum allowed limit of ${this.config.maxReadBytes} bytes.`);
    }

    const rawContent = await fs.readFile(securePath, 'utf-8');
    const lines = rawContent.split(/\r?\n/);
    const totalLines = lines.length;

    let selectedLines = lines;
    let truncated = false;

    if (startLine !== undefined || endLine !== undefined) {
      const start = Math.max((startLine || 1) - 1, 0);
      const end = endLine !== undefined ? Math.min(endLine, totalLines) : totalLines;
      selectedLines = lines.slice(start, end);
      truncated = selectedLines.length < totalLines;
    }

    return {
      content: selectedLines.join('\n'),
      totalLines,
      truncated,
    };
  }

  async fileInfo(subPath: string): Promise<Record<string, any>> {
    const securePath = resolveSecureSandboxPath(this.config.sandboxRoot, subPath);
    const stat = await fs.stat(securePath);
    const relToRoot = path.relative(this.config.sandboxRoot, securePath).split(path.sep).join('/');

    return {
      name: path.basename(securePath),
      relativePath: relToRoot || '.',
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      sizeBytes: stat.size,
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
      permissions: stat.mode.toString(8),
    };
  }

  async searchFiles(query: string, subPath: string = '.'): Promise<FileEntry[]> {
    const securePath = resolveSecureSandboxPath(this.config.sandboxRoot, subPath);
    const matches: FileEntry[] = [];
    const lowerQuery = query.toLowerCase();

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name.toLowerCase().includes(lowerQuery)) {
          const stat = await fs.stat(fullPath);
          matches.push({
            name: entry.name,
            relativePath: path.relative(securePath, fullPath).split(path.sep).join('/'),
            isDirectory: entry.isDirectory(),
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
          });
        }
        if (entry.isDirectory()) {
          await walk(fullPath);
        }
      }
    }

    await walk(securePath);
    return matches.slice(0, 100);
  }
}
