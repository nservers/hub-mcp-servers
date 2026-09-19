import test from 'node:test';
import assert from 'node:assert';
import { ScraperEngine } from '../dist/scraper/engine.js';

test('ScraperEngine converts sample HTML into clean Markdown and extracts headings', () => {
  const engine = new ScraperEngine({
    userAgent: 'test-agent',
    timeoutMs: 5000,
    maxContentBytes: 100000,
    portHttp: 3000,
    hostHttp: '0.0.0.0',
  });

  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>nServers Cloud Architecture</title>
        <meta name="description" content="Overview of nServers Cloud VPS nodes" />
        <script>console.log("malicious_tracker");</script>
        <style>body { background: black; }</style>
      </head>
      <body>
        <nav><a href="/home">Home</a></nav>
        <main>
          <h1>High-Performance Cloud VPS</h1>
          <p>nServers provides <strong>sub-millisecond</strong> NVMe storage.</p>
          <h2>Key Features</h2>
          <ul>
            <li>AMD EPYC Processors</li>
            <li>Anti-DDoS Protection</li>
          </ul>
          <pre><code>nservers vps create --plan=pro</code></pre>
        </main>
        <footer>Copyright 2026 nServers</footer>
      </body>
    </html>
  `;

  const result = engine.convertHtmlToMarkdown(sampleHtml, 'https://nservers.io/cloud');

  assert.strictEqual(result.title, 'nServers Cloud Architecture');
  assert.strictEqual(result.description, 'Overview of nServers Cloud VPS nodes');
  assert.ok(result.headings.includes('High-Performance Cloud VPS'));
  assert.ok(result.headings.includes('Key Features'));
  assert.ok(result.markdown.includes('# High-Performance Cloud VPS'));
  assert.ok(result.markdown.includes('**sub-millisecond**'));
  assert.ok(!result.markdown.includes('malicious_tracker'));
  assert.ok(!result.markdown.includes('Copyright 2026'));
  assert.ok(result.wordCount > 5);
  assert.ok(result.estimatedTokens > 5);
});

test('ScraperEngine blocks cloud metadata and internal link-local endpoints', async () => {
  const engine = new ScraperEngine({
    userAgent: 'test-agent',
    timeoutMs: 5000,
    maxContentBytes: 100000,
    portHttp: 3000,
    hostHttp: '0.0.0.0',
  });

  await assert.rejects(
    async () => await engine.scrapeUrl('http://169.254.169.254/latest/meta-data/'),
    /Access to cloud metadata endpoint/
  );

  await assert.rejects(
    async () => await engine.scrapeUrl('http://metadata.google.internal/computeMetadata/v1/'),
    /Access to cloud metadata endpoint/
  );
});
