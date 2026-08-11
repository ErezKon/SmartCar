import { getAccessToken } from '../auth/token-manager';
import { SMARTCAR_VEHICLE_API_URL, SMARTCAR_MANAGEMENT_API_URL } from '../config/constants';
import { SmartcarApiError, RateLimitError, parseSmartcarError } from '../utils/errors';
import { retry, sleep } from '../utils/helpers';
import { logger } from '../utils/logger';

export type ApiBase = 'vehicle' | 'management';

interface RequestOptions {
  method?: string;
  path: string;
  base?: ApiBase;
  body?: unknown;
  userId?: string;
  headers?: Record<string, string>;
  noAuth?: boolean;
  rawUrl?: string;
}

function getBaseUrl(base: ApiBase): string {
  return base === 'management' ? SMARTCAR_MANAGEMENT_API_URL : SMARTCAR_VEHICLE_API_URL;
}

/**
 * HTTP client for the Smartcar v3 API.
 *
 * Wraps Node.js native `fetch()` with automatic Bearer token attachment,
 * `sc-user-id` header injection, rate-limit retry (429 with `retry-after`),
 * and exponential-backoff retries (up to 3 attempts).
 *
 * Supports both the Vehicle API and Management API base URLs, as well as
 * raw URLs for unauthenticated endpoints like the Compatibility API.
 */
export class SmartcarClient {
  /**
   * Send an HTTP request to the Smartcar API.
   *
   * @param options - Request configuration including method, path, base URL,
   *   body, userId, and optional headers.
   * @returns The parsed JSON response body.
   * @throws {SmartcarApiError} When the API returns a non-2xx status.
   * @throws {RateLimitError} When rate-limited (HTTP 429), after retry exhaustion.
   */
  async request<T = unknown>(options: RequestOptions): Promise<T> {
    const {
      method = 'GET',
      path,
      base = 'vehicle',
      body,
      userId,
      headers: extraHeaders = {},
      noAuth = false,
      rawUrl,
    } = options;

    return retry(async () => {
      const url = rawUrl || `${getBaseUrl(base)}${path}`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders,
      };

      if (!noAuth) {
        const token = await getAccessToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      if (userId) {
        headers['sc-user-id'] = userId;
      }

      logger.debug(`${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        logger.warn(`Rate limited, retrying after ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        throw new RateLimitError(retryAfter);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const responseBody = await response.json();

      if (!response.ok) {
        throw parseSmartcarError(response.status, responseBody);
      }

      return responseBody as T;
    }, { maxRetries: 3 });
  }

  /** Send a GET request. */
  async get<T = unknown>(path: string, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ ...options, method: 'GET', path });
  }

  /** Send a POST request with an optional JSON body. */
  async post<T = unknown>(path: string, body?: unknown, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ ...options, method: 'POST', path, body });
  }

  /** Send a DELETE request. Returns `undefined` on 204 No Content. */
  async delete<T = unknown>(path: string, options?: Partial<RequestOptions>): Promise<T> {
    return this.request<T>({ ...options, method: 'DELETE', path });
  }
}

export const smartcarClient = new SmartcarClient();
