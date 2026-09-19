import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { DockerClientWrapper } from '../docker/client.js';

export function registerDockerTools(server: McpServer, docker: DockerClientWrapper): void {
  server.tool(
    'list_containers',
    'List Docker containers currently present on the host with status, image, and port allocations.',
    {
      all: z
        .boolean()
        .default(true)
        .describe('Include stopped containers in the listing (default: true)'),
    },
    async ({ all }) => {
      try {
        const containers = await docker.listContainers(all);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: containers.length,
                  containers,
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
              text: `Failed to list Docker containers: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'inspect_container',
    'Inspect low-level container details including state, volume mounts, networks, and sanitized environment variables.',
    {
      containerId: z
        .string()
        .min(1)
        .describe('Container ID or name to inspect (e.g. "my-app" or "a1b2c3d4e5f6")'),
    },
    async ({ containerId }) => {
      try {
        const details = await docker.inspectContainer(containerId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(details, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to inspect container "${containerId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'container_logs',
    'Fetch recent stdout and stderr output logs from a target Docker container.',
    {
      containerId: z
        .string()
        .min(1)
        .describe('Container ID or name to query logs from'),
      tail: z
        .number()
        .int()
        .positive()
        .max(1000)
        .default(100)
        .describe('Number of recent log lines to retrieve (default: 100, max: 1000)'),
      timestamps: z
        .boolean()
        .default(false)
        .describe('Include ISO timestamps for each log line'),
    },
    async ({ containerId, tail, timestamps }) => {
      try {
        const logs = await docker.getContainerLogs(containerId, tail, timestamps);
        return {
          content: [
            {
              type: 'text',
              text: logs || '[No logs produced yet]',
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to fetch logs for container "${containerId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'container_stats',
    'Retrieve live snapshot telemetry metrics (CPU percentage, memory usage, limits, and network throughput) of a container.',
    {
      containerId: z
        .string()
        .min(1)
        .describe('Target container ID or name'),
    },
    async ({ containerId }) => {
      try {
        const stats = await docker.getContainerStats(containerId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to read stats for container "${containerId}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'list_images',
    'List all container images available locally in the Docker Engine with their tags and sizes.',
    {},
    async () => {
      try {
        const images = await docker.listImages();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  count: images.length,
                  images,
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
              text: `Failed to list Docker images: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
