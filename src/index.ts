import { BrowseFleetError, AuthError, NotFoundError, RateLimitError, ValidationError, ServerError } from './errors.js';
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
  AgentRequest,
  AgentResult,
  AgentStep,
  CheckoutRequest,
  CheckoutResponse,
  PortalRequest,
  PortalResponse,
  BillingUsage,
  LiveFrame,
} from './types.js';

export { BrowseFleetError, AuthError, NotFoundError, RateLimitError, ValidationError, ServerError };
export * from './types.js';

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
    return this.client._request<Session>('GET', `/v1/sessions/${encodeURIComponent(sessionId)}`);
  }

  /** Release (close) a single session. */
  async release(sessionId: string): Promise<{ released: boolean }> {
    return this.client._request<{ released: boolean }>('POST', `/v1/sessions/${encodeURIComponent(sessionId)}/release`);
  }

  /** Release multiple sessions or all sessions. */
  async releaseAll(ids?: string[]): Promise<{ released: number }> {
    const body: ReleaseRequest = ids ? { ids } : {};
    return this.client._request<{ released: number }>('POST', '/v1/sessions/release', body);
  }

  /** Execute Computer API actions on a session (click, type, scroll, navigate, screenshot). */
  async actions(sessionId: string, actions: BrowserAction[]): Promise<ActionResponse> {
    return this.client._request<ActionResponse>('POST', `/v1/sessions/${encodeURIComponent(sessionId)}/actions`, { actions });
  }

  /** Solve a CAPTCHA on a session page. */
  async solveCaptcha(sessionId: string, options: CaptchaSolveRequest = {}): Promise<CaptchaSolveResponse> {
    return this.client._request<CaptchaSolveResponse>('POST', `/v1/sessions/${encodeURIComponent(sessionId)}/captcha/solve`, options);
  }

  /** List files available in a session. */
  async listFiles(sessionId: string): Promise<FileListResponse> {
    return this.client._request<FileListResponse>('GET', `/v1/sessions/${encodeURIComponent(sessionId)}/files`);
  }

  /** Upload a file to a session. */
  async uploadFile(sessionId: string, fileName: string, data: Buffer | Uint8Array): Promise<FileUploadResponse> {
    return this.client._requestMultipart<FileUploadResponse>(
      `/v1/sessions/${encodeURIComponent(sessionId)}/files`,
      fileName,
      data,
    );
  }

  /** Download a file from a session. Returns the raw Response for binary handling. */
  async downloadFile(sessionId: string, fileName: string): Promise<ArrayBuffer> {
    return this.client._requestRaw('GET', `/v1/sessions/${encodeURIComponent(sessionId)}/files/${encodeURIComponent(fileName)}`);
  }

  /** Stream live screenshots from a session via SSE. */
  async live(sessionId: string): Promise<ReadableStream<LiveFrame>> {
    return this.client._requestSSE<LiveFrame>('GET', `/v1/sessions/${encodeURIComponent(sessionId)}/live`);
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
    return this.client._request<Profile>('GET', `/v1/profiles/${encodeURIComponent(profileId)}`);
  }

  /** Delete a profile. */
  async delete(profileId: string): Promise<{ deleted: boolean }> {
    return this.client._request<{ deleted: boolean }>('DELETE', `/v1/profiles/${encodeURIComponent(profileId)}`);
  }
}

class AgentAPI {
  constructor(private readonly client: BrowseFleet) {}

  /** Run an autonomous agent task. Creates a session, executes the task, and releases it. */
  async run(request: AgentRequest): Promise<AgentResult> {
    return this.client._request<AgentResult>('POST', '/v1/agent', request);
  }

  /** Run an agent task on an existing session. */
  async runOnSession(sessionId: string, request: AgentRequest): Promise<AgentResult> {
    return this.client._request<AgentResult>('POST', `/v1/sessions/${encodeURIComponent(sessionId)}/agent`, request);
  }

  /** Stream agent steps in real time via SSE. */
  async stream(request: AgentRequest): Promise<ReadableStream<AgentStep>> {
    return this.client._requestSSE<AgentStep>('POST', '/v1/agent/stream', request);
  }
}

class BillingAPI {
  constructor(private readonly client: BrowseFleet) {}

  /** Create a Stripe checkout session. */
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
    return this.client._request<CheckoutResponse>('POST', '/v1/billing/checkout', request);
  }

  /** Create a Stripe customer portal session. */
  async createPortal(request: PortalRequest): Promise<PortalResponse> {
    return this.client._request<PortalResponse>('POST', '/v1/billing/portal', request);
  }

  /** Get current billing period usage. */
  async getUsage(): Promise<BillingUsage> {
    return this.client._request<BillingUsage>('GET', '/v1/billing/usage');
  }
}

export class BrowseFleet {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  public readonly sessions: SessionsAPI;
  public readonly profiles: ProfilesAPI;
  public readonly agent: AgentAPI;
  public readonly billing: BillingAPI;

  constructor(options: BrowseFleetOptions = {}) {
    const key = options.apiKey || (typeof process !== 'undefined' ? process.env.BROWSEFLEET_API_KEY : undefined);
    if (!key) {
      throw new AuthError('apiKey is required — pass it in options or set BROWSEFLEET_API_KEY');
    }
    this.apiKey = key;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? 2;

    this.sessions = new SessionsAPI(this);
    this.profiles = new ProfilesAPI(this);
    this.agent = new AgentAPI(this);
    this.billing = new BillingAPI(this);
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

  /** @internal Determine if a response status is retryable. */
  private _isRetryable(status: number): boolean {
    return status === 429 || status >= 500;
  }

  /** @internal Compute retry delay with exponential backoff and jitter. */
  private _retryDelay(attempt: number, retryAfterHeader?: string | null): number {
    if (retryAfterHeader) {
      const seconds = Number(retryAfterHeader);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
    const base = Math.min(1000 * Math.pow(2, attempt), 30000);
    const jitter = Math.random() * 200;
    return base + jitter;
  }

  /** @internal Sleep for a given number of milliseconds. */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** @internal Common headers for all requests. */
  private _baseHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'browsefleet-node/0.1.0',
    };
  }

  /** @internal Make a JSON API request with retry. */
  async _request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: BrowseFleetError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const headers: Record<string, string> = {
        ...this._baseHeaders(),
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

      if (response.ok) {
        return (await response.json()) as T;
      }

      const errorBody = await response.json().catch(() => null);
      const message = (errorBody as { error?: string })?.error || response.statusText;

      if (this._isRetryable(response.status) && attempt < this.maxRetries) {
        const delay = this._retryDelay(attempt, response.headers.get('Retry-After'));
        await this._sleep(delay);
        lastError = this._buildError(response.status, message, errorBody, response);
        continue;
      }

      this._throwForStatus(response.status, message, errorBody, response);
    }

    throw lastError || new BrowseFleetError('Request failed after retries', 0);
  }

  /** @internal Make a request expecting binary data with retry. */
  async _requestRaw(method: string, path: string, body?: unknown): Promise<ArrayBuffer> {
    const url = `${this.baseUrl}${path}`;
    let lastError: BrowseFleetError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const headers: Record<string, string> = {
        ...this._baseHeaders(),
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

      if (response.ok) {
        return response.arrayBuffer();
      }

      const errorBody = await response.json().catch(() => null);
      const message = (errorBody as { error?: string })?.error || response.statusText;

      if (this._isRetryable(response.status) && attempt < this.maxRetries) {
        const delay = this._retryDelay(attempt, response.headers.get('Retry-After'));
        await this._sleep(delay);
        lastError = this._buildError(response.status, message, errorBody, response);
        continue;
      }

      this._throwForStatus(response.status, message, errorBody, response);
    }

    throw lastError || new BrowseFleetError('Request failed after retries', 0);
  }

  /** @internal Make a multipart/form-data upload request. */
  async _requestMultipart<T>(path: string, fileName: string, data: Buffer | Uint8Array): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const formData = new FormData();
    // Copy into a plain ArrayBuffer to satisfy Blob's type requirements (Buffer.buffer is ArrayBufferLike)
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    const blob = new Blob([new Uint8Array(arrayBuffer)]);
    formData.append('file', blob, fileName);

    const headers: Record<string, string> = {
      ...this._baseHeaders(),
      'Accept': 'application/json',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
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
      this._throwForStatus(response.status, message, errorBody, response);
    }

    return (await response.json()) as T;
  }

  /** @internal Make an SSE request and return a ReadableStream that emits parsed JSON objects. */
  async _requestSSE<T>(method: string, path: string, body?: unknown): Promise<ReadableStream<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...this._baseHeaders(),
      'Accept': 'text/event-stream',
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message = (errorBody as { error?: string })?.error || response.statusText;
      this._throwForStatus(response.status, message, errorBody, response);
    }

    if (!response.body) {
      throw new BrowseFleetError('Response body is null — SSE streaming not supported', 0);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream<T>({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data) as T;
                controller.enqueue(parsed);
              } catch {
                // Skip malformed JSON lines
              }
            }
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  /** @internal Build a typed error without throwing. */
  private _buildError(status: number, message: string, body: unknown, response: Response): BrowseFleetError {
    switch (status) {
      case 400:
        return new ValidationError(message, body);
      case 401:
        return new AuthError(message);
      case 404:
        return new NotFoundError(message);
      case 429: {
        const ra = response.headers.get('Retry-After');
        const retryAfter = ra ? Number(ra) : undefined;
        return new RateLimitError(message, isNaN(retryAfter as number) ? undefined : retryAfter);
      }
      default:
        if (status >= 500) {
          return new ServerError(message, status, body);
        }
        return new BrowseFleetError(message, status, body);
    }
  }

  private _throwForStatus(status: number, message: string, body: unknown, response: Response): never {
    throw this._buildError(status, message, body, response);
  }
}

export default BrowseFleet;
