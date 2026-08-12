import { env } from '../config/env';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { getVehicleStatus, getChargingData } from './vehicles';
import { logger } from '../utils/logger';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let polling = false;

/**
 * Poll all known vehicles for status + charging data.
 * Errors are logged but never propagate — the scheduler keeps running.
 */
async function pollAllVehicles(): Promise<void> {
  if (polling) {
    logger.debug('SAIC scheduler: previous poll still running, skipping');
    return;
  }

  polling = true;
  try {
    const db = await getDatabase();
    const repo = new SaicRepository(db);
    const vehicles = repo.getCachedVehicles();

    if (vehicles.length === 0) {
      logger.debug('SAIC scheduler: no cached vehicles to poll');
      return;
    }

    for (const vehicle of vehicles) {
      try {
        logger.debug(`SAIC scheduler: polling VIN ${vehicle.vin.slice(0, 6)}...`);
        await getVehicleStatus(vehicle.vin, true);
        await getChargingData(vehicle.vin, true);
        logger.debug(`SAIC scheduler: VIN ${vehicle.vin.slice(0, 6)}... done`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`SAIC scheduler: poll failed for VIN ${vehicle.vin.slice(0, 6)}...: ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`SAIC scheduler: unexpected error: ${msg}`);
  } finally {
    polling = false;
  }
}

export function startSaicPolling(): void {
  if (!env.SAIC_POLLING_ENABLED) {
    logger.info('SAIC polling disabled (SAIC_POLLING_ENABLED != true). Data will only refresh on manual request.');
    return;
  }

  const intervalMs = env.SAIC_POLL_INTERVAL_MS;
  logger.info(`SAIC polling enabled — interval: ${intervalMs / 1000}s`);

  // Run first poll after a short delay to let the server finish starting
  setTimeout(() => {
    pollAllVehicles();
  }, 5000);

  pollTimer = setInterval(pollAllVehicles, intervalMs);
}

export function stopSaicPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info('SAIC polling stopped');
  }
}

export function isPollingEnabled(): boolean {
  return env.SAIC_POLLING_ENABLED;
}

export function getPollingIntervalMs(): number {
  return env.SAIC_POLL_INTERVAL_MS;
}
