import { createHash } from 'node:crypto';
import {
  SAIC_TENANT_ID, SAIC_USER_AGENT,
  SAIC_EVENT_POLL_INTERVAL_MS, SAIC_EVENT_POLL_TIMEOUT_MS,
  SAIC_COMMAND_POLL_INTERVAL_MS,
  SaicRegionConfig,
} from './config';
import {
  encryptRequestEnvelope, decryptResponse,
  normalizeContentType, NormalizedContentType,
  RequestEncryptionParams, computeVerificationString,
} from './crypto';
import {
  SaicApiError, SaicAuthError, SaicCommandUnconfirmedError, SaicRetryException, SaicVehicleAsleepError,
} from './errors';
import { sleep, redactSensitive } from '../utils/helpers';
import { logger } from '../utils/logger';

export interface SaicApiResponse<T = unknown> {
  code: number;
  data?: T;
  message?: string;
}

export interface SaicRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  token?: string;
  contentType?: string;
  useEventPolling?: boolean;
  commandMode?: boolean; // uses 1s initial poll for commands
}

export function hashVin(vin: string): string {
  return createHash('sha256').update(vin, 'utf8').digest('hex');
}

export class SaicClient {
  constructor(private region: SaicRegionConfig) {}

  private buildRequestPath(path: string, queryParams?: Record<string, string>): string {
    let requestPath = path.startsWith('/') ? path : `/${path}`;
    if (queryParams) {
      const qs = Object.entries(queryParams)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (qs) requestPath += `?${qs}`;
    }
    return requestPath;
  }

  /**
   * Send an encrypted request to the SAIC API.
   * If useEventPolling is true, handles the async event-id polling pattern.
   */
  async request<T = unknown>(options: SaicRequestOptions): Promise<T> {
    if (options.useEventPolling) {
      return this.requestWithEventPolling<T>(options);
    }
    const result = await this.singleRequest<T>(options);
    return (result.data !== undefined ? result.data : result) as T;
  }

  private async singleRequest<T>(
    options: SaicRequestOptions,
    eventId?: string
  ): Promise<SaicApiResponse<T>> {
    const {
      method = 'GET',
      path,
      body,
      token = '',
      contentType: rawContentType = 'application/json',
    } = options;

    const currentTs = String(Date.now());
    const normalized = normalizeContentType(rawContentType);
    const requestPath = path.startsWith('/') ? path : `/${path}`;

    const encParams: RequestEncryptionParams = {
      requestPath,
      currentTs,
      tenantId: SAIC_TENANT_ID,
      userToken: token,
      contentType: normalized,
    };

    // Build body string
    let bodyStr = '';
    if (body !== undefined && body !== null) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Encrypt body
    // For empty body (GET requests), compute verification with empty encrypted body —
    // do NOT encrypt an empty string (AES padding produces a non-empty ciphertext
    // that would be included in the HMAC but not sent, causing a verification mismatch).
    const { encryptedBody, verificationString } = bodyStr
      ? encryptRequestEnvelope(bodyStr, encParams)
      : { encryptedBody: '', verificationString: computeVerificationString(encParams, '') };

    // Assemble headers
    const headers: Record<string, string> = {
      'User-Agent': SAIC_USER_AGENT,
      'Content-Type': `${normalized};charset=utf-8`,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'REGION': this.region.regionCode,
      'APP-SEND-DATE': currentTs,
      'APP-CONTENT-ENCRYPTED': '1',
      'tenant-id': SAIC_TENANT_ID,
      'User-Type': 'app',
      'APP-LANGUAGE-TYPE': 'en',
      'ORIGINAL-CONTENT-TYPE': normalized,
      'APP-VERIFICATION-STRING': verificationString,
    };

    if (token) {
      headers['blade-auth'] = token;
    }

    if (eventId !== undefined) {
      headers['event-id'] = eventId;
    }

    const url = `${this.region.baseUri}${requestPath}`;
    logger.debug(`SAIC ${method} ${requestPath}`);

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (encryptedBody && method !== 'GET') {
      fetchOptions.body = encryptedBody;
    }

    const response = await fetch(url, fetchOptions);

    // Handle HTTP-level auth errors
    if (response.status === 401 || response.status === 403) {
      throw new SaicAuthError(`SAIC API returned ${response.status}`);
    }

    if (!response.ok && response.status !== 200) {
      let errorBody = '';
      try { errorBody = await response.text(); } catch { /* ignore */ }
      logger.error(`SAIC API HTTP ${response.status} for ${method} ${requestPath}: ${errorBody.slice(0, 500)}`);
      throw new SaicApiError(
        `SAIC API returned HTTP ${response.status}`,
        response.status
      );
    }

    // Decrypt response
    const responseText = await response.text();
    if (!responseText) {
      return { code: 0 } as SaicApiResponse<T>;
    }

    const respSendDate = response.headers.get('APP-SEND-DATE') || currentTs;
    const respContentType = response.headers.get('ORIGINAL-CONTENT-TYPE') || 'application/json';
    const respEventId = response.headers.get('event-id');

    let plaintext: string;
    try {
      plaintext = decryptResponse(responseText, respSendDate, respContentType);
    } catch {
      // Response might not be encrypted (some error responses come as plain JSON)
      plaintext = responseText;
    }

    let parsed: SaicApiResponse<T>;
    try {
      parsed = JSON.parse(plaintext);
    } catch {
      throw new SaicApiError(`Failed to parse SAIC response: ${redactSensitive(plaintext.slice(0, 200))}`, 500);
    }

    // Check for API-level errors
    if (parsed.code === 401 || parsed.code === 403) {
      throw new SaicAuthError(parsed.message || `SAIC auth error (code ${parsed.code})`);
    }

    if (parsed.code !== 0) {
      // Non-zero code with an event-id means "not ready yet, retry"
      if (respEventId) {
        throw new SaicRetryException(
          parsed.message || `Waiting for vehicle response (code ${parsed.code})`,
          respEventId
        );
      }
      // Hard error codes
      if ([2, 3, 7].includes(parsed.code)) {
        throw new SaicApiError(
          parsed.message || `SAIC API error (code ${parsed.code})`,
          400,
          parsed.code
        );
      }
      throw new SaicApiError(
        parsed.message || `SAIC API error (code ${parsed.code})`,
        500,
        parsed.code
      );
    }

    // Also retry when code is 0 but data is missing and an event-id was provided.
    // The SAIC API returns {code:0, message:"success"} as an acknowledgement with
    // an event-id header meaning "poll again with this event-id for actual data."
    if (parsed.data === undefined && respEventId) {
      throw new SaicRetryException('Waiting for vehicle data', respEventId);
    }

    return parsed;
  }

  // Known SAIC API error messages that indicate the command may have been
  // dispatched to the vehicle even though the API reported failure.
  private static COMMAND_UNCONFIRMED_PATTERNS = [
    'remote control instruction failed',
  ];

  private static isCommandPossiblySucceeded(message: string): boolean {
    const lower = message.toLowerCase();
    return SaicClient.COMMAND_UNCONFIRMED_PATTERNS.some(p => lower.includes(p));
  }

  /**
   * Event-ID polling loop for async endpoints (vehicle status, commands, etc.).
   * Sends initial request with event-id: 0, then polls until data arrives or timeout.
   */
  private async requestWithEventPolling<T>(options: SaicRequestOptions): Promise<T> {
    const pollInterval = options.commandMode
      ? SAIC_COMMAND_POLL_INTERVAL_MS
      : SAIC_EVENT_POLL_INTERVAL_MS;
    const timeout = SAIC_EVENT_POLL_TIMEOUT_MS;
    const startTime = Date.now();

    let eventId = '0';
    let commandDispatched = false;

    while (true) {
      try {
        const result = await this.singleRequest<T>(
          { ...options, useEventPolling: false },
          eventId
        );
        // Success - return data
        if (result.data !== undefined) {
          return result.data;
        }
        // code 0 but no data - treat as success with empty data
        return result as unknown as T;
      } catch (error) {
        if (error instanceof SaicRetryException) {
          eventId = error.eventId;
          commandDispatched = true;

          if (Date.now() - startTime > timeout) {
            if (options.commandMode) {
              // Command was dispatched but vehicle didn't confirm in time
              throw new SaicCommandUnconfirmedError(
                'Vehicle did not confirm the command within the polling timeout'
              );
            }
            throw new SaicVehicleAsleepError(
              'Vehicle did not respond within the polling timeout'
            );
          }

          await sleep(pollInterval);
          continue;
        }

        // For command mode, if the command was dispatched (event-id progressed)
        // or the error matches known "possibly succeeded" patterns, treat as
        // unconfirmed rather than failed. The SAIC API sometimes reports failure
        // even when the car executes the command successfully.
        if (
          options.commandMode &&
          error instanceof SaicApiError &&
          !(error instanceof SaicAuthError) &&
          (commandDispatched || SaicClient.isCommandPossiblySucceeded(error.message))
        ) {
          logger.warn(
            `SAIC command may have succeeded despite API error (dispatched=${commandDispatched}): ${error.message}`
          );
          throw new SaicCommandUnconfirmedError(error.message);
        }

        throw error;
      }
    }
  }
}
