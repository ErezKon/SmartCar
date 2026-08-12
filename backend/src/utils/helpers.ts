export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      await sleep(jitter);
    }
  }

  throw new Error('Unreachable');
}

export interface PaginationParams {
  page?: number;
  size?: number;
}

/**
 * Validate a time string is in HH:mm format (00:00 - 23:59).
 */
export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * Validate a day-of-week string.
 */
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export function isValidDay(day: string): boolean {
  return VALID_DAYS.includes(day.toLowerCase());
}

/**
 * Redact sensitive values from a string before logging.
 * Masks tokens, passwords, keys, and credentials.
 */
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(access_token|blade-auth|authorization|token)['":\s]*['"]?([A-Za-z0-9_\-./+=]{8,})/gi, replacement: '$1: [REDACTED]' },
  { pattern: /(password|passwd|secret|credential|api[_-]?key)['":\s]*['"]?([^\s'"}{,]{4,})/gi, replacement: '$1: [REDACTED]' },
  { pattern: /(SAIC_CREDENTIALS_KEY)[=:]([^\s]{4,})/gi, replacement: '$1=[REDACTED]' },
];

export function redactSensitive(message: string): string {
  let result = message;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);

  return entries.length > 0 ? `?${entries.join('&')}` : '';
}
