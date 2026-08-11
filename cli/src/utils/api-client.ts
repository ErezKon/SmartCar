import chalk from 'chalk';

const DEFAULT_BASE_URL = 'http://localhost:3000';

function getBaseUrl(): string {
  return process.env.SMARTCAR_API_URL || DEFAULT_BASE_URL;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

export async function apiRequest<T = any>(
  method: string,
  path: string,
  options: {
    body?: any;
    userId?: string;
    query?: Record<string, string | number | undefined>;
  } = {}
): Promise<ApiResponse<T>> {
  const baseUrl = getBaseUrl();
  let url = `${baseUrl}${path}`;

  if (options.query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.userId) {
    headers['sc-user-id'] = options.userId;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const message = data?.error || data?.message || `HTTP ${response.status}`;
      throw new ApiError(message, response.status, data);
    }

    return { ok: true, status: response.status, data };
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err instanceof TypeError && (err as any).cause?.code === 'ECONNREFUSED') {
      throw new ApiError(
        `Cannot connect to backend at ${baseUrl}. Is the server running?`,
        0
      );
    }

    throw new ApiError(
      `Request failed: ${(err as Error).message}`,
      0
    );
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseData?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(err: unknown): void {
  if (err instanceof ApiError) {
    if (err.statusCode === 0) {
      console.error(chalk.red(`\nConnection Error: ${err.message}`));
    } else if (err.statusCode === 401) {
      console.error(chalk.red(`\nAuthentication Error: ${err.message}`));
      console.error(chalk.yellow('Run "smartcar auth status" to check your auth configuration.'));
    } else {
      console.error(chalk.red(`\nAPI Error (${err.statusCode}): ${err.message}`));
    }
  } else {
    console.error(chalk.red(`\nUnexpected Error: ${(err as Error).message}`));
  }
}

export const api = {
  get: <T = any>(path: string, opts?: { userId?: string; query?: Record<string, string | number | undefined> }) =>
    apiRequest<T>('GET', path, opts),
  post: <T = any>(path: string, body?: any, opts?: { userId?: string }) =>
    apiRequest<T>('POST', path, { body, ...opts }),
  delete: <T = any>(path: string, opts?: { userId?: string }) =>
    apiRequest<T>('DELETE', path, opts),
};
