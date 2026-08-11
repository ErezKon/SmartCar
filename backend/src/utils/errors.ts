export class SmartcarApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string,
    public errorCode?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SmartcarApiError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message = 'Access token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class RateLimitError extends SmartcarApiError {
  public retryAfter: number;

  constructor(retryAfter: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class VehicleNotFoundError extends SmartcarApiError {
  constructor(vehicleId: string) {
    super(`Vehicle not found: ${vehicleId}`, 404, 'VEHICLE_NOT_FOUND');
    this.name = 'VehicleNotFoundError';
  }
}

export class ConnectFlowError extends Error {
  constructor(
    message: string,
    public errorType: string,
    public errorDescription?: string
  ) {
    super(message);
    this.name = 'ConnectFlowError';
  }
}

export function parseSmartcarError(statusCode: number, body: unknown): SmartcarApiError {
  const b = body as Record<string, unknown>;
  const errors = b.errors as Array<{ title?: string; detail?: string; code?: string }> | undefined;
  if (errors && errors.length > 0) {
    const err = errors[0];
    return new SmartcarApiError(
      err.detail || err.title || 'Unknown Smartcar API error',
      statusCode,
      err.code || 'UNKNOWN',
      err.code,
      errors
    );
  }
  const message = (b.message as string) || (b.error_description as string) || 'Unknown error';
  const errorType = (b.error as string) || 'UNKNOWN';
  return new SmartcarApiError(message, statusCode, errorType);
}
