# CDP direct (Node SDK)

Use the SDK to create a BrowseFleet session, then connect `puppeteer-core` directly to its CDP proxy URL.

## Prerequisites

- Node 20+
- A BrowseFleet server at `http://localhost:3000`

## Run

```bash
npm install
npm start
```

## What it does

1. Uses the SDK to create a session (gets stealth + profile + lifecycle management for free).
2. Reads the `websocketUrl` from the session response.
3. Connects `puppeteer-core` to that URL via `puppeteer.connect({ browserWSEndpoint })`.
4. Drives the browser via raw puppeteer (navigate, evaluate, etc.).
5. Disconnects (BrowseFleet still owns the underlying browser).
6. Releases the BrowseFleet session.
