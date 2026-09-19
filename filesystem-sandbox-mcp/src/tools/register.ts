import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SandboxedFs } from '../sandbox/fs.js';

export function registerFilesystemTools(server: McpServer, sandboxedFs: SandboxedFs): void {
  server.tool(
    'list_directory',
    'List files and subdirectories within a sandboxed directory path, enforcing strict traversal isolation.',
    {
      path: z
        .string()
        .default('.')
        .describe('Relative directory path inside the sandbox (default: ".")'),
    },
    async ({ path: dirPath }) => {
      try {
        const entries = await sandboxedFs.listDirectory(dirPath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  path: dirPath,
                  count: entries.length,
                  entries,
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
              text: `Failed to list directory: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'read_file',
    'Read text content from a file inside the isolated storage sandbox with optional line slicing and size protection.',
    {
      filePath: z
        .string()
        .min(1)
        .describe('Relative path to the target file within the sandbox (e.g. "logs/app.log")'),
      startLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Starting line number (1-indexed)'),
      endLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Ending line number (inclusive)'),
    },
    async ({ filePath, startLine, endLine }) => {
      try {
        const result = await sandboxedFs.readFile(filePath, startLine, endLine);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  filePath,
                  totalLines: result.totalLines,
                  truncated: result.truncated,
                  content: result.content,
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
              text: `Failed to read file "${filePath}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'search_files',
    'Search for files and directories matching a query substring within the sandbox hierarchy.',
    {
      query: z
        .string()
        .min(1)
        .describe('Search query substring (e.g. "config" or ".json")'),
      subPath: z
        .string()
        .default('.')
        .describe('Subdirectory to restrict search within (default: ".")'),
    },
    async ({ query, subPath }) => {
      try {
        const matches = await sandboxedFs.searchFiles(query, subPath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  query,
                  matchesCount: matches.length,
                  matches,
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
              text: `Search failed: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'file_info',
    'Inspect file or directory metadata including size, creation timestamp, and permissions within the sandbox.',
    {
      filePath: z
        .string()
        .min(1)
        .describe('Relative path to target file or directory'),
    },
    async ({ filePath }) => {
      try {
        const info = await sandboxedFs.fileInfo(filePath);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to inspect file info: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
