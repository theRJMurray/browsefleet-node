import { describe, it, expect } from 'vitest';
import { SDK_VERSION } from '../src/version.js';
import { BrowseFleet } from '../src/index.js';

describe('SDK version', () => {
  it('exports a non-empty SDK_VERSION string', () => {
    expect(SDK_VERSION).toBeTypeOf('string');
    expect(SDK_VERSION.length).toBeGreaterThan(0);
  });

  it('matches semver or the explicit dev fallback', () => {
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+(-[\w.-]+)?$/);
  });
});

describe('Public API surface', () => {
  it('BrowseFleet exposes sessions, profiles, agent sub-APIs', () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    expect(client.sessions).toBeDefined();
    expect(client.profiles).toBeDefined();
    expect(client.agent).toBeDefined();
  });

  it('BrowseFleet no longer exposes a `billing` sub-API', () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    expect((client as unknown as { billing?: unknown }).billing).toBeUndefined();
  });

  it('top-level quick actions are present', () => {
    const client = new BrowseFleet({ baseUrl: 'http://localhost:3000' });
    expect(typeof client.scrape).toBe('function');
    expect(typeof client.screenshot).toBe('function');
    expect(typeof client.pdf).toBe('function');
    expect(typeof client.usage).toBe('function');
    expect(typeof client.health).toBe('function');
  });
});
