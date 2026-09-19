import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GitClientWrapper } from '../git/client.js';

export function registerGitTools(server: McpServer, git: GitClientWrapper): void {
  server.tool(
    'git_status',
    'Retrieve Git repository working tree status including modified, staged, and untracked files.',
    {},
    async () => {
      try {
        const status = await git.getStatus();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  currentBranch: status.current,
                  trackingBranch: status.tracking,
                  ahead: status.ahead,
                  behind: status.behind,
                  isClean: status.isClean(),
                  staged: status.staged,
                  modified: status.modified,
                  notAdded: status.not_added,
                  deleted: status.deleted,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to query Git status: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'git_log',
    'Retrieve recent Git commit history with author details, timestamps, and commit messages.',
    {
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .default(20)
        .describe('Maximum number of commits to retrieve (default: 20, max: 100)'),
    },
    async ({ limit }) => {
      try {
        const log = await git.getLog(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total: log.total,
                  latest: log.latest,
                  commits: log.all,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to retrieve Git log: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'git_branches',
    'List all local and remote branches in the repository, identifying the current active branch.',
    {},
    async () => {
      try {
        const branches = await git.getBranches();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  current: branches.current,
                  branches: branches.all,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to list branches: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'git_diff',
    'Generate unified diff output for unstaged working directory changes or between two Git revisions/branches.',
    {
      target: z
        .string()
        .optional()
        .describe('Target revision, branch, or commit hash to diff against'),
      base: z
        .string()
        .optional()
        .describe('Base revision or commit hash for comparison (requires target)'),
    },
    async ({ target, base }) => {
      try {
        const diffOutput = await git.getDiff(target, base);
        return {
          content: [
            {
              type: 'text',
              text: diffOutput || '[No changes detected / Diff is empty]',
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to generate unified diff: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'git_show',
    'Inspect a specific Git commit, tree, or file content at a given revision.',
    {
      revisionOrPath: z
        .string()
        .min(1)
        .describe('Commit hash or revision specifier (e.g. "HEAD", "main:README.md", or "a1b2c3d")'),
    },
    async ({ revisionOrPath }) => {
      try {
        const output = await git.getShow(revisionOrPath);
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to show revision "${revisionOrPath}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
