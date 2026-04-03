# browsefleet

TypeScript SDK for the [BrowseFleet](https://browsefleet.com) cloud browser API. Control headless browsers with full stealth, scrape pages to markdown, take screenshots, generate PDFs, and automate with the Computer API.

Zero dependencies -- uses native `fetch` (Node 18+).

## Installation

```bash
npm install browsefleet
```

## Quick Start

```typescript
import BrowseFleet from 'browsefleet';

const bf = new BrowseFleet({
  apiKey: 'bf_your_api_key',
  baseUrl: 'https://api.browsefleet.com', // optional, this is the default
});

// Scrape a page to markdown
const page = await bf.scrape('https://example.com');
console.log(page.markdown);
console.log(page.title);
console.log(page.links);

// Take a screenshot
const image = await bf.screenshot('https://example.com', { fullPage: true, format: 'png' });
// image is an ArrayBuffer -- write to file with fs.writeFileSync('screenshot.png', Buffer.from(image))

// Generate a PDF
const pdf = await bf.pdf('https://example.com', { format: 'A4', printBackground: true });
```

## Sessions

Sessions give you a full browser instance with a WebSocket URL you can connect to with puppeteer-core or Playwright.

```typescript
// Create a session
const session = await bf.sessions.create({
  stealth: 'full',
  viewport: { width: 1920, height: 1080 },
  blockAds: true,
  timezone: 'America/New_York',
});

console.log(session.id);
console.log(session.websocketUrl); // connect puppeteer-core here
console.log(session.viewerUrl);

// List active sessions
const { sessions, count } = await bf.sessions.list();

// Get a specific session
const s = await bf.sessions.get(session.id);

// Release when done
await bf.sessions.release(session.id);

// Release all sessions
await bf.sessions.releaseAll();

// Release specific sessions
await bf.sessions.releaseAll(['session-id-1', 'session-id-2']);
```

### Connecting with puppeteer-core

```typescript
import puppeteer from 'puppeteer-core';

const session = await bf.sessions.create({ stealth: 'full' });

const browser = await puppeteer.connect({
  browserWSEndpoint: session.websocketUrl,
});

const page = await browser.newPage();
await page.goto('https://example.com');
const title = await page.title();

await browser.disconnect();
await bf.sessions.release(session.id);
```

## Computer API

Execute browser actions programmatically -- click, type, scroll, navigate, and take screenshots.

```typescript
const session = await bf.sessions.create();

const result = await bf.sessions.actions(session.id, [
  { type: 'navigate', url: 'https://example.com' },
  { type: 'wait', duration: 1000 },
  { type: 'click', x: 100, y: 200 },
  { type: 'type', text: 'hello world' },
  { type: 'press_key', key: 'Enter' },
  { type: 'screenshot' },
]);

for (const r of result.results) {
  console.log(r.type, r.success);
  if (r.screenshot) {
    // base64-encoded screenshot
  }
}

await bf.sessions.release(session.id);
```

### Available Actions

| Action | Fields | Description |
|--------|--------|-------------|
| `navigate` | `url` | Navigate to a URL |
| `click` | `x`, `y`, `button?`, `clickCount?` | Click at coordinates |
| `type` | `text` | Type text |
| `press_key` | `key` | Press a keyboard key |
| `scroll` | `x?`, `y?`, `deltaX?`, `deltaY?` | Scroll the page |
| `move_mouse` | `x`, `y` | Move mouse to coordinates |
| `wait` | `duration` | Wait for milliseconds |
| `screenshot` | -- | Take a screenshot |

## CAPTCHA Solving

Automatically solve CAPTCHAs on a session page (requires server-side 2captcha configuration).

```typescript
const result = await bf.sessions.solveCaptcha(session.id, { type: 'auto' });
console.log(result.success, result.type, result.duration);
```

## Profiles

Profiles persist cookies and local storage across sessions.

```typescript
// Create a profile
const profile = await bf.profiles.create({ name: 'my-account' });

// Use it when creating a session
const session = await bf.sessions.create({ profileId: profile.id });

// List all profiles
const { profiles } = await bf.profiles.list();

// Get a profile
const p = await bf.profiles.get(profile.id);

// Delete a profile
await bf.profiles.delete(profile.id);
```

## File Management

Upload and download files within a session context.

```typescript
// List files in a session
const { files } = await bf.sessions.listFiles(session.id);

// Download a file
const data = await bf.sessions.downloadFile(session.id, 'report.pdf');
```

## Usage Statistics

```typescript
const usage = await bf.usage();
console.log(usage.totalSessions);
console.log(usage.activeSessions);
console.log(usage.todayBrowserHours);
console.log(usage.todayApiCalls);

for (const day of usage.daily) {
  console.log(day.date, day.sessions, day.browserHours);
}
```

## Health Check

```typescript
const healthy = await bf.health();
console.log(healthy); // true or false
```

## Error Handling

The SDK throws typed errors for different failure modes:

```typescript
import BrowseFleet, { BrowseFleetError, AuthError, RateLimitError, NotFoundError } from 'browsefleet';

try {
  await bf.scrape('https://example.com');
} catch (err) {
  if (err instanceof AuthError) {
    // 401 -- invalid API key
    console.error('Authentication failed:', err.message);
  } else if (err instanceof RateLimitError) {
    // 429 -- too many requests
    console.error('Rate limited:', err.message);
  } else if (err instanceof NotFoundError) {
    // 404 -- resource not found
    console.error('Not found:', err.message);
  } else if (err instanceof BrowseFleetError) {
    // Other API error
    console.error(`API error ${err.status}:`, err.message);
  }
}
```

## Configuration

```typescript
const bf = new BrowseFleet({
  apiKey: 'bf_xxx',          // required
  baseUrl: 'https://...',   // optional, default: https://api.browsefleet.com
  timeout: 120_000,         // optional, request timeout in ms, default: 60000
});
```

## Scrape Options

All quick actions support stealth and proxy configuration:

```typescript
const page = await bf.scrape('https://example.com', {
  waitFor: '#content',           // wait for CSS selector
  stealth: 'full',               // none | basic | full
  proxyUrl: 'http://proxy:8080', // route through proxy
  headers: { 'X-Custom': 'val' },
  cookies: [{ name: 'sid', value: 'abc', domain: 'example.com' }],
  timeout: 30_000,
});
```

## License

MIT
