import { describe, it, expect, afterEach, vi } from 'vitest';
import { BrowseFleet } from '../src/index.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

interface CallArg {
  url: string;
  method: string;
  body: unknown;
}

function captureCalls(responseBody: object = { id: 'mock-id' }, status = 200): CallArg[] {
  const calls: CallArg[] = [];
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const bodyStr = init?.body as string | undefined;
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      body: bodyStr ? JSON.parse(bodyStr) : undefined,
    });
    return new Response(JSON.stringify(responseBody), { status });
  }) as unknown as typeof fetch;
  return calls;
}

describe('SessionsAPI request shapes', () => {
  it('create() POSTs to /v1/sessions with the body', async () => {
    const calls = captureCalls({ id: 'sess-1' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.create({ stealth: 'full', operatorMode: true, sensitiveMode: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions');
    expect(calls[0].body).toEqual({ stealth: 'full', operatorMode: true, sensitiveMode: false });
  });

  it('control() POSTs to /v1/sessions/:id/control with the control body', async () => {
    const calls = captureCalls({ id: 'sess-1', controlMode: 'agent' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.control('sess-1', {
      controlMode: 'agent',
      sensitiveMode: false,
      reason: 'operator finished',
    });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions/sess-1/control');
    expect(calls[0].body).toEqual({
      controlMode: 'agent',
      sensitiveMode: false,
      reason: 'operator finished',
    });
  });

  it('list() GETs /v1/sessions', async () => {
    const calls = captureCalls({ sessions: [], count: 0 });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.list();
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions');
  });

  it('get() GETs /v1/sessions/:id and URL-encodes the id', async () => {
    const calls = captureCalls({ id: 'with space' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.get('with space');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions/with%20space');
  });

  it('release() POSTs to /v1/sessions/:id/release', async () => {
    const calls = captureCalls({ released: true });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.release('sess-1');
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions/sess-1/release');
  });

  it('actions() POSTs the action list to /v1/sessions/:id/actions', async () => {
    const calls = captureCalls({ results: [] });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.sessions.actions('sess-1', [
      { type: 'navigate', url: 'https://example.com' },
      { type: 'click', x: 10, y: 20 },
    ]);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('http://localhost:3000/v1/sessions/sess-1/actions');
    expect(calls[0].body).toEqual({
      actions: [
        { type: 'navigate', url: 'https://example.com' },
        { type: 'click', x: 10, y: 20 },
      ],
    });
  });
});

describe('Quick action request shapes', () => {
  it('scrape() POSTs to /v1/scrape with the url folded into the body', async () => {
    const calls = captureCalls({ markdown: '# example' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.scrape('https://example.com', { stealth: 'full', timeout: 10_000 });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe('http://localhost:3000/v1/scrape');
    expect(calls[0].body).toEqual({
      url: 'https://example.com',
      stealth: 'full',
      timeout: 10_000,
    });
  });

  it('usage() GETs /v1/usage', async () => {
    const calls = captureCalls({ totalSessions: 0 });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.usage();
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toBe('http://localhost:3000/v1/usage');
  });
});
