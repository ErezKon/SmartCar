import { existsSync, mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger';

const LOG_DIR = path.resolve(__dirname, '../../data');
const LOG_FILE = path.join(LOG_DIR, 'saic-api-log.jsonl');

export interface SaicRequestLogEntry {
  timestamp: string;
  request: {
    method: string;
    path: string;
    body?: unknown;
    eventId?: string;
  };
  response: {
    httpStatus: number;
    code?: number;
    data?: unknown;
    message?: string;
    eventId?: string;
  };
  durationMs: number;
  error?: string;
}

let loggingEnabled: boolean | null = null;

export function isRequestLoggingEnabled(): boolean {
  if (loggingEnabled === null) {
    loggingEnabled = process.env.SAIC_LOG_REQUESTS?.toLowerCase() === 'true';
    if (loggingEnabled) {
      logger.info(`SAIC request logging enabled -> ${LOG_FILE}`);
    }
  }
  return loggingEnabled;
}

export function logSaicRequest(entry: SaicRequestLogEntry): void {
  if (!isRequestLoggingEnabled()) return;

  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }
    appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch (err) {
    logger.error(`Failed to write SAIC request log: ${(err as Error).message}`);
  }
}
