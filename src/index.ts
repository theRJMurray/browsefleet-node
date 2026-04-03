import { BrowseFleetError, AuthError, NotFoundError, RateLimitError } from './errors';
import type {
  BrowseFleetOptions,
  CreateSessionRequest,
  Session,
  SessionList,
  ReleaseRequest,
  ScrapeRequest,
  ScrapeResponse,
  ScreenshotRequest,
  PdfRequest,
  BrowserAction,
  ActionResponse,
  CaptchaSolveRequest,
  CaptchaSolveResponse,
  CreateProfileRequest,
  Profile,
  ProfileList,
  FileUploadResponse,
  FileListResponse,
  UsageStats,
} from './types';

export { BrowseFleetError, AuthError, NotFoundError, RateLimitError };
export * from './types';

const DEFAULT_BASE_URL = 'https://api.browsefleet.com';
const DEFAULT_TIMEOUT = 60_000;

class SessionsAPI {
  constructor(private readonly client: BrowseFleet) {}

  /** Create a new browser session. */
  async create(options: CreateSessionRequest = {}): Promise<Session> {
    return this.client._request<Session>('POST', '/v1/sessions', options);
  }

  /** List all active sessions. */
  async list(): Promise<SessionList> {
    return this.client._request<SessionList>('GET', '/v1/sessions');
  }

  /** Get a single session by ID. */
  async get(sessionId: string): Promise<Session> {
    return this.client._request<Session>('GET', `/v1/sessions/${sessionId}`);
  }

  /** Release (close) a single session. */
  async release(sessionId: string): Promise<{ released: boolean }> {
    return this.client._request<{ released: boolean }>('POST', `/v1/sessions/${sessionId}/release`);
  }

  /** Release multiple sessions or all sessions. */
  async releaseAll(ids?: string[]): Promise<{ released: number }> {
    const body: ReleaseRequest = ids ? { ids } : {};
    return this.client._request<{ released: number }>('POST', '/v1/sessions/release', body);
  }

  /** Execute Computer API actions on a session (click, type, scroll, navigate, screenshot). */
  async actions(sessionId: string, actions: BrowserAction[]): Promise<ActionResponse> {
    return this.client._request<ActionResponse>('POST', `/v1/sessions/${sessionId}/actions`, { actions });
  }

  /** Solve a CAPTCHA on a session page. */
  async solveCaptcha(sessionId: string, options: CaptchaSolveRequest = {}): Promise<CaptchaSolveResponse> {
    return this.client._request<CaptchaSolveResponse>('POST', `/v1/sessions/${sessionId}/captcha/solve`, options);
  }

  /** List files available in a session. */
  async listFiles(sessionId: string): Promise<FileListResponse> {
    return this.client._request<FileListResponse>('GET', `/v1/sessions/${sessionId}/files`);
  }

  /** Download a file from a session. Returns the raw Response for binary handling. */
  async downloadFile(sessionId: string, fileName: string): Promise<ArrayBuffer> {
    return this.client._requestRaw('GET', `/v1/sessions/${sessionId}/files/${fileName}`);
  }
}

class ProfilesAPI {
  constructor(private readonly client: BrowseFleet) {}

  /** Create a new browser profile for persistent cookies/storage. */
  async create(options: CreateProfileRequest): Promise<Profile> {
    return this.client._request<Profile>('POST', '/v1/profiles', options);
  }

  /** List all profiles. */
  async list(): Promise<ProfileList> {
    return this.client._request<ProfileList>('GET', '/v1/profiles');
  }

  /** Get a single profile by ID. */
  async get(profileId: string): Promise<Profile> {
    return this.client._request<Profile>('GET', `/v1/profiles/${profileId}`);
  }

  /** Delete a profile. */
  async delete(profileId: string): Promise<{ deleted: boolean }> {
    return this.client._request<{ deleted: boolean }>('DELETE', `/v1/profiles/${profileId}`);
  }
}

export class BrowseFleet {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  public readonly sessions: SessionsAPI;
  public readonly profiles: ProfilesAPI;

  constructor(options: BrowseFleetOptions) {
    if (!options.apiKey) {
      throw new AuthError('apiKey is required');
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout || DEFAULT_TIMEOUT;

    this.sessions = new SessionsAPI(this);
    this.profiles = new ProfilesAPI(this);
  }

  // ─── Quick Actions ────────────────────────────────────────────────────

  /** Scrape a URL and get back HTML, markdown, readability text, links, and metadata. */
  async scrape(url: string, options: Omit<ScrapeRequest, 'url'> = {}): Promise<ScrapeResponse> {
    return this._request<ScrapeResponse>('POST', '/v1/scrape', { url, ...options });
  }

  /** Take a screenshot of a URL. Returns the image as an ArrayBuffer. */
  async screenshot(url: string, options: Omit<ScreenshotRequest, 'url'> = {}): Promise<ArrayBuffer> {
    return this._requestRaw('POST', '/v1/screenshot', { url, ...options });
  }

  /** Generate a PDF from a URL. Returns the PDF as an ArrayBuffer. */
  async pdf(url: string, options: Omit<PdfRequest, 'url'> = {}): Promise<ArrayBuffer> {
    return this._requestRaw('POST', '/v1/pdf', { url, ...options });
  }

  /** Get API usage statistics. */
  async usage(): Promise<UsageStats> {
    return this._request<UsageStats>('GET', '/v1/usage');
  }

  /** Health check. Returns true if the server is reachable. */
  async health(): Promise<boolean> {
    try {
      await this._request<{ status: string }>('GET', '/health');
      return true;
    } catch {
      return false;
    }
  }

  // ─── Internal Request Helpers ─────────────────────────────────────────

  /** @internal Make a JSON API request. */
  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new BrowseFleetError(`Request timed out after ${this.timeout}ms`, 0);
      }
      throw new BrowseFleetError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = (errorBody as { error?: string })?.error || response.statusText;
      this._throwForStatus(response.status, message, errorBody);
    }

    return (await response.json()) as T;
  }

  /** @internal Make a request expecting binary data. */
  async _requestRaw(method: string, path: string, body?: unknown): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new BrowseFleetError(`Request timed out after ${this.timeout}ms`, 0);
      }
      throw new BrowseFleetError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = (errorBody as { error?: string })?.error || response.statusText;
      this._throwForStatus(response.status, message, errorBody);
    }

    return response.arrayBuffer();
  }

  private _throwForStatus(status: number, message: string, body: unknown): never {
    switch (status) {
      case 401:
        throw new AuthError(message);
      case 404:
        throw new NotFoundError(message);
      case 429:
        throw new RateLimitError(message);
      default:
        throw new BrowseFleetError(message, status, body);
    }
  }
}

export default BrowseFleet;
