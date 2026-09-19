import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ScraperEngine } from '../scraper/engine.js';

export function registerScraperTools(server: McpServer, scraper: ScraperEngine): void {
  server.tool(
    'scrape_url',
    'Fetch a target web page and convert its content into clean, readable Markdown optimized for LLM context, stripping scripts and styling.',
    {
      url: z
        .string()
        .url()
        .describe('Fully qualified HTTP/HTTPS web address to scrape'),
      cleanChrome: z
        .boolean()
        .default(true)
        .describe('Strip navigations, footers, and sidebars to isolate main article body (default: true)'),
    },
    async ({ url, cleanChrome }) => {
      try {
        const result = await scraper.scrapeUrl(url, cleanChrome);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to scrape URL "${url}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'extract_links',
    'Discover and extract all hyperlinks on a web page, categorizing them as internal or external domain links.',
    {
      url: z
        .string()
        .url()
        .describe('Target page URL to parse for links'),
    },
    async ({ url }) => {
      try {
        const links = await scraper.extractLinks(url);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  url,
                  count: links.length,
                  links,
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
              text: `Failed to extract links from "${url}": ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'extract_structured_data',
    'Extract semantic JSON-LD schemas and OpenGraph social metadata from a web page.',
    {
      url: z
        .string()
        .url()
        .describe('Target web address to inspect for metadata'),
    },
    async ({ url }) => {
      try {
        const data = await scraper.extractStructuredData(url);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Failed to extract structured data: ${error.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
