export class BrowseFleetError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'BrowseFleetError';
    this.status = status;
    this.body = body;
  }
}

export class AuthError extends BrowseFleetError {
  constructor(message = 'Invalid or missing API key') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends BrowseFleetError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends BrowseFleetError {
  public readonly retryAfter?: number;

  constructor(message = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends BrowseFleetError {
  constructor(message = 'Validation error', body?: unknown) {
    super(message, 400, body);
    this.name = 'ValidationError';
  }
}

export class ServerError extends BrowseFleetError {
  constructor(message = 'Server error', status = 500, body?: unknown) {
    super(message, status, body);
    this.name = 'ServerError';
  }
}
