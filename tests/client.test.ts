import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BrowseFleet,
  AuthError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  ServerError,
} from '../src/index.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('BrowseFleet constructor', () => {
  it('accepts an empty options object (no apiKey required)', () => {
    expect(() => new BrowseFleet()).not.toThrow();
  });

  it('uses BROWSEFLEET_API_KEY env var when no apiKey is passed', () => {
    const old = process.env.BROWSEFLEET_API_KEY;
    process.env.BROWSEFLEET_API_KEY = 'env-key-fallback';
    try {
      const client = new BrowseFleet();
      expect(client).toBeInstanceOf(BrowseFleet);
    } finally {
      if (old === undefined) delete process.env.BROWSEFLEET_API_KEY;
      else process.env.BROWSEFLEET_API_KEY = old;
    }
  });

  it('uses BROWSEFLEET_URL env var when no baseUrl is passed', async () => {
    const old = process.env.BROWSEFLEET_URL;
    process.env.BROWSEFLEET_URL = 'http://bf.test.example.com:9999';
    const fetchMock = vi.fn(
      async (_input: string | URL, _init?: RequestInit) => new Response('{}', { status: 200 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const client = new BrowseFleet();
      await client.usage().catch(() => {});
      expect(fetchMock).toHaveBeenCalled();
      const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
      expect(url).toContain('bf.test.example.com:9999');
    } finally {
      if (old === undefined) delete process.env.BROWSEFLEET_URL;
      else process.env.BROWSEFLEET_URL = old;
    }
  });

  it('strips trailing slashes from baseUrl', async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL, _init?: RequestInit) => new Response('{}', { status: 200 }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000///' });
    await client.usage().catch(() => {});
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toBe('http://localhost:3000/v1/usage');
  });
});

describe('Request headers', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    ) as unknown as typeof fetch;
  });

  it('sends x-api-key when apiKey is set', async () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', apiKey: 'secret-key' });
    await client.health();
    const init = (globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock
      .calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('secret-key');
  });

  it('does not send x-api-key when apiKey is empty', async () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.health();
    const init = (globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock
      .calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('sends a User-Agent with the SDK version', async () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await client.health();
    const init = (globalThis.fetch as unknown as { mock: { calls: [unknown, RequestInit][] } }).mock
      .calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/^browsefleet-node\//);
  });
});

describe('health()', () => {
  it('returns true when /health responds 200', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    await expect(client.health()).resolves.toBe(true);
  });

  it('returns false when /health responds non-2xx', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response('{"error":"down"}', { status: 503 }),
    ) as unknown as typeof fetch;
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    await expect(client.health()).resolves.toBe(false);
  });
});

describe('Error class re-exports', () => {
  it('all five error types are exported', () => {
    expect(AuthError).toBeDefined();
    expect(NotFoundError).toBeDefined();
    expect(RateLimitError).toBeDefined();
    expect(ValidationError).toBeDefined();
    expect(ServerError).toBeDefined();
  });
});
