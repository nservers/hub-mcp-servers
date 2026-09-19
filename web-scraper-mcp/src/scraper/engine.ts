import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { AppConfig } from '../config.js';

export interface ScrapedPageResult {
  url: string;
  title: string;
  description?: string;
  markdown: string;
  wordCount: number;
  estimatedTokens: number;
  headings: string[];
}

export interface ExtractedLink {
  text: string;
  url: string;
  isExternal: boolean;
}

export class ScraperEngine {
  private config: AppConfig;
  private turndown: TurndownService;

  constructor(config: AppConfig) {
    this.config = config;
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '_',
    });

    // Remove images or simplify rules if necessary
    this.turndown.remove(['script', 'style', 'noscript', 'iframe']);
  }

  private async fetchHtml(targetUrl: string): Promise<string> {
    const parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Invalid protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`);
    }

    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'instance-data' ||
      hostname.endsWith('.internal')
    ) {
      throw new Error(`Access to cloud metadata endpoint '${hostname}' is strictly forbidden.`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': this.config.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP fetch failed with status ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  convertHtmlToMarkdown(html: string, baseUrl: string, cleanChrome: boolean = true): ScrapedPageResult {
    const $ = cheerio.load(html);

    const title =
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      'Untitled Page';

    const description =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content');

    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    if (cleanChrome) {
      $('script, style, noscript, nav, footer, header, aside, iframe, svg, form').remove();
    }

    // Prefer main or article content if available
    let contentHtml = '';
    const mainContent = $('main, article, #content, .content').first();
    if (mainContent.length > 0) {
      contentHtml = mainContent.html() || $('body').html() || '';
    } else {
      contentHtml = $('body').html() || '';
    }

    const markdown = this.turndown.turndown(contentHtml).trim();
    const wordCount = markdown ? markdown.split(/\s+/).length : 0;
    const estimatedTokens = Math.round(wordCount * 1.33);

    return {
      url: baseUrl,
      title,
      description,
      markdown,
      wordCount,
      estimatedTokens,
      headings: headings.slice(0, 30),
    };
  }

  async scrapeUrl(url: string, cleanChrome: boolean = true): Promise<ScrapedPageResult> {
    const html = await this.fetchHtml(url);
    return this.convertHtmlToMarkdown(html, url, cleanChrome);
  }

  async extractLinks(url: string): Promise<ExtractedLink[]> {
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);
    const parsedBase = new URL(url);

    const links: ExtractedLink[] = [];
    const seen = new Set<string>();

    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim();
      const text = $(el).text().trim();

      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) {
        return;
      }

      try {
        const absoluteUrl = new URL(rawHref, url).toString();
        if (seen.has(absoluteUrl)) return;
        seen.add(absoluteUrl);

        const isExternal = new URL(absoluteUrl).hostname !== parsedBase.hostname;
        links.push({
          text: text || '[link]',
          url: absoluteUrl,
          isExternal,
        });
      } catch {
        // Skip malformed URLs
      }
    });

    return links;
  }

  async extractStructuredData(url: string): Promise<Record<string, any>> {
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text().trim());
        jsonLd.push(parsed);
      } catch {
        // Ignore unparseable JSON-LD
      }
    });

    const openGraph: Record<string, string> = {};
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property');
      const val = $(el).attr('content');
      if (prop && val) openGraph[prop] = val;
    });

    return {
      url,
      jsonLd,
      openGraph,
    };
  }
}
