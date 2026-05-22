import { describe, it, expect, afterEach, vi } from 'vitest';
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

function mockStatus(
  status: number,
  body: object | string = { error: 'mocked' },
  headers: Record<string, string> = {},
): typeof fetch {
  return vi.fn(
    async () =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers,
      }),
  ) as unknown as typeof fetch;
}

describe('Status to error mapping', () => {
  it('400 throws ValidationError', async () => {
    globalThis.fetch = mockStatus(400, { error: 'bad input' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    await expect(client.usage()).rejects.toBeInstanceOf(ValidationError);
  });

  it('401 throws AuthError', async () => {
    globalThis.fetch = mockStatus(401, { error: 'no key' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    await expect(client.usage()).rejects.toBeInstanceOf(AuthError);
  });

  it('404 throws NotFoundError', async () => {
    globalThis.fetch = mockStatus(404, { error: 'not found' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    await expect(client.sessions.get('missing-id')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('429 throws RateLimitError with retryAfter', async () => {
    globalThis.fetch = mockStatus(429, { error: 'slow down' }, { 'Retry-After': '7' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    try {
      await client.usage();
      expect.fail('Expected RateLimitError');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(7);
    }
  });

  it('500 throws ServerError', async () => {
    globalThis.fetch = mockStatus(500, { error: 'broken' });
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 0 });
    await expect(client.usage()).rejects.toBeInstanceOf(ServerError);
  });
});

describe('Retry behavior', () => {
  it('retries on 429 up to maxRetries', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      if (calls <= 2) {
        return new Response(JSON.stringify({ error: 'slow' }), {
          status: 429,
          headers: { 'Retry-After': '0' },
        });
      }
      return new Response(JSON.stringify({ totalSessions: 1 }), { status: 200 });
    }) as unknown as typeof fetch;

    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 3 });
    const res = await client.usage();
    expect(calls).toBe(3);
    expect((res as { totalSessions: number }).totalSessions).toBe(1);
  });

  it('does not retry on 4xx that is not 429', async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls++;
      return new Response(JSON.stringify({ error: 'bad' }), { status: 400 });
    }) as unknown as typeof fetch;

    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000', maxRetries: 3 });
    await expect(client.usage()).rejects.toBeInstanceOf(ValidationError);
    expect(calls).toBe(1);
  });
});
