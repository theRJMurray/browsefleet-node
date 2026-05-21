import { writeFileSync } from 'node:fs';
import { BrowseFleet } from 'browsefleet';

const bf = new BrowseFleet({
  baseUrl: process.env.BROWSEFLEET_URL ?? 'http://localhost:3000',
  apiKey: process.env.BROWSEFLEET_API_KEY,
});

async function main() {
  console.log('Step 1: Health check');
  const ok = await bf.health();
  if (!ok) throw new Error('Server is not reachable');
  console.log('  OK');

  console.log('\nStep 2: Scrape https://example.com');
  const page = await bf.scrape('https://example.com');
  console.log('  Title:', page.title);
  console.log('  Status:', page.statusCode);
  console.log('  Markdown (first 200 chars):', page.markdown.slice(0, 200), '...');

  console.log('\nStep 3: Screenshot to example.png');
  const png = await bf.screenshot('https://example.com', { format: 'png', fullPage: true });
  writeFileSync('example.png', Buffer.from(png));
  console.log(`  Wrote example.png (${png.byteLength} bytes)`);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
