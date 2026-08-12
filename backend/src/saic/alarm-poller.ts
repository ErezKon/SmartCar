import { getMessages } from './vehicles';
import { startChargingSession, stopChargingSession, getActiveChargingSession } from './charging-sessions';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { logger } from '../utils/logger';
import type { MessageEntity } from './types';

const POLL_INTERVAL_MS = 60_000; // 60 seconds

let pollTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;
let lastProcessedMessageId: string | null = null;

/**
 * Determine if an alarm message indicates charging has started.
 * The exact message format is unknown — this checks common patterns
 * and will be refined as we discover real alarm messages.
 */
function isChargingStartAlarm(msg: MessageEntity): boolean {
  const title = (msg.title || '').toLowerCase();
  const content = (msg.content || '').toLowerCase();
  const type = (msg.messageType || '').toLowerCase();

  return (
    (title.includes('charg') && (title.includes('start') || title.includes('begin'))) ||
    (content.includes('charg') && (content.includes('start') || content.includes('begin'))) ||
    type === 'charging_start'
  );
}

/**
 * Determine if an alarm message indicates charging has stopped.
 */
function isChargingStopAlarm(msg: MessageEntity): boolean {
  const title = (msg.title || '').toLowerCase();
  const content = (msg.content || '').toLowerCase();
  const type = (msg.messageType || '').toLowerCase();

  return (
    (title.includes('charg') && (title.includes('stop') || title.includes('end') || title.includes('complete') || title.includes('finish'))) ||
    (content.includes('charg') && (content.includes('stop') || content.includes('end') || content.includes('complete') || content.includes('finish'))) ||
    type === 'charging_stop' || type === 'charging_complete'
  );
}

/**
 * Process alarm messages and trigger charging sessions when appropriate.
 */
async function processAlarmMessages(messages: MessageEntity[]): Promise<void> {
  // Sort by messageId ascending to process in order
  const sorted = [...messages].sort((a, b) => {
    const idA = typeof a.messageId === 'number' ? a.messageId : parseInt(String(a.messageId), 10);
    const idB = typeof b.messageId === 'number' ? b.messageId : parseInt(String(b.messageId), 10);
    return idA - idB;
  });

  for (const msg of sorted) {
    const msgId = String(msg.messageId);

    // Skip already-processed messages
    if (lastProcessedMessageId && msgId <= lastProcessedMessageId) {
      continue;
    }

    // Log all alarm messages at debug level for format discovery
    logger.debug(
      `Alarm message: id=${msgId} type="${msg.messageType}" title="${msg.title}" ` +
      `content="${msg.content}" vin="${msg.vin}" time="${msg.messageTime}"`
    );

    const vin = msg.vin;
    if (!vin) {
      lastProcessedMessageId = msgId;
      continue;
    }

    try {
      if (isChargingStartAlarm(msg)) {
        // Check if there's already an active session
        const active = await getActiveChargingSession(vin);
        if (!active) {
          logger.info(`Alarm poller: charging start detected for VIN ${vin.slice(0, 6)}... (msg ${msgId})`);
          await startChargingSession(vin);
        } else {
          logger.debug(`Alarm poller: charging start alarm for VIN ${vin.slice(0, 6)}... but session already active, skipping`);
        }
      } else if (isChargingStopAlarm(msg)) {
        const active = await getActiveChargingSession(vin);
        if (active) {
          logger.info(`Alarm poller: charging stop detected for VIN ${vin.slice(0, 6)}... (msg ${msgId})`);
          await stopChargingSession(vin);
        } else {
          logger.debug(`Alarm poller: charging stop alarm for VIN ${vin.slice(0, 6)}... but no active session, skipping`);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn(`Alarm poller: failed to process charging event for VIN ${vin.slice(0, 6)}...: ${errMsg}`);
    }

    lastProcessedMessageId = msgId;
  }
}

/**
 * Poll for new alarm messages.
 */
async function pollAlarms(): Promise<void> {
  if (polling) {
    logger.debug('Alarm poller: previous poll still running, skipping');
    return;
  }

  polling = true;
  try {
    // Check if a SAIC account is connected before polling
    const db = await getDatabase();
    const repo = new SaicRepository(db);
    const account = repo.getAccount();
    if (!account) {
      logger.debug('Alarm poller: no SAIC account connected, skipping');
      return;
    }

    const messages = await getMessages('ALARM', 1, 20);
    if (messages.length > 0) {
      await processAlarmMessages(messages);
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Don't log auth errors as warnings since the account might not be set up yet
    if (errMsg.includes('No SAIC account configured')) {
      logger.debug(`Alarm poller: ${errMsg}`);
    } else {
      logger.warn(`Alarm poller: poll failed: ${errMsg}`);
    }
  } finally {
    polling = false;
  }
}

/** Start the alarm message poller (always on, 12V-safe) */
export function startAlarmPoller(): void {
  logger.info(`Alarm poller started — polling every ${POLL_INTERVAL_MS / 1000}s (12V-safe, server-side only)`);

  // First poll after a short delay
  setTimeout(() => {
    pollAlarms();
  }, 10_000);

  pollTimer = setInterval(pollAlarms, POLL_INTERVAL_MS);
}

/** Stop the alarm message poller */
export function stopAlarmPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('Alarm poller stopped');
  }
}
