import puppeteer from 'puppeteer-core';
import { BrowseFleet } from 'browsefleet';

const bf = new BrowseFleet({
  baseUrl: process.env.BROWSEFLEET_URL ?? 'http://localhost:3000',
  apiKey: process.env.BROWSEFLEET_API_KEY,
});

async function main() {
  console.log('Step 1: Create a BrowseFleet session via the SDK');
  const session = await bf.sessions.create({ stealth: 'full' });
  console.log('  Session id:', session.id);
  console.log('  CDP URL:', session.websocketUrl);

  const ws = process.env.BROWSEFLEET_API_KEY
    ? `${session.websocketUrl}?apiKey=${encodeURIComponent(process.env.BROWSEFLEET_API_KEY)}`
    : session.websocketUrl;

  console.log('\nStep 2: Connect puppeteer-core directly');
  const browser = await puppeteer.connect({ browserWSEndpoint: ws });
  try {
    const page = await browser.newPage();
    await page.goto('https://example.com', { waitUntil: 'networkidle2' });
    const title = await page.title();
    const h1 = await page.$eval('h1', (el) => el.textContent ?? '');
    console.log('  Title:', title);
    console.log('  H1:', h1);
    await page.close();
  } finally {
    console.log('\nStep 3: Disconnect (BrowseFleet still owns the browser)');
    await browser.disconnect();
  }

  console.log('\nStep 4: Release the BrowseFleet session');
  await bf.sessions.release(session.id);
  console.log('  Released.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
