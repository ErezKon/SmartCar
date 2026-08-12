export class SaicApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public apiCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SaicApiError';
  }
}

export class SaicAuthError extends SaicApiError {
  constructor(message = 'SAIC authentication failed') {
    super(message, 401, undefined);
    this.name = 'SaicAuthError';
  }
}

export class SaicVehicleAsleepError extends SaicApiError {
  constructor(message = 'Vehicle is asleep and did not respond within the timeout') {
    super(message, 504, undefined);
    this.name = 'SaicVehicleAsleepError';
  }
}

export class SaicPinRequiredError extends SaicApiError {
  constructor(message = 'This command requires a PIN that is not configured') {
    super(message, 403, undefined);
    this.name = 'SaicPinRequiredError';
  }
}

export class SaicCommandUnconfirmedError extends SaicApiError {
  constructor(message = 'Command was sent but confirmation was not received') {
    super(message, 202, undefined);
    this.name = 'SaicCommandUnconfirmedError';
  }
}

export class SaicRetryException extends Error {
  constructor(
    message: string,
    public eventId: string
  ) {
    super(message);
    this.name = 'SaicRetryException';
  }
}

export class SaicThrottledError extends SaicApiError {
  constructor(message = 'Too many requests to the SAIC API') {
    super(message, 429, undefined);
    this.name = 'SaicThrottledError';
  }
}
