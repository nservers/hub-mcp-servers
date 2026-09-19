import { simpleGit, SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git';
import { AppConfig } from '../config.js';

export class GitClientWrapper {
  private git: SimpleGit;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.git = simpleGit(config.repoPath);
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string; isRepo?: boolean }> {
    const start = performance.now();
    try {
      const isRepo = await this.git.checkIsRepo();
      const latencyMs = Math.round(performance.now() - start);
      return { ok: isRepo, latencyMs, isRepo };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async getStatus(): Promise<StatusResult> {
    return await this.git.status();
  }

  async getLog(limit: number = 20): Promise<LogResult> {
    const maxCount = Math.min(Math.max(limit, 1), 200);
    return await this.git.log({ maxCount });
  }

  async getBranches(): Promise<BranchSummary> {
    return await this.git.branch(['-a']);
  }

  async getDiff(target?: string, base?: string): Promise<string> {
    if (target && base) {
      return await this.git.diff([`${base}..${target}`]);
    }
    if (target) {
      return await this.git.diff([target]);
    }
    return await this.git.diff();
  }

  async getShow(revisionOrPath: string): Promise<string> {
    return await this.git.show([revisionOrPath]);
  }
}
