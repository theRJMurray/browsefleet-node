# Quickstart

Scrape, screenshot, and release. The fastest tour of the SDK.

## Prerequisites

- Node 20+
- A BrowseFleet server at `http://localhost:3000` (or set `BROWSEFLEET_URL`)

## Run

```bash
npm install
npm start
```

## What it does

1. Health check.
2. Scrape `https://example.com`, print the title and first 200 chars of markdown.
3. Take a full-page PNG screenshot, write to `example.png`.
4. Print the size of the screenshot.
