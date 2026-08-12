import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import type { SaicChargingSession, SaicChargingStats } from '../db/repositories/saic.repository';
import { getVehicleStatus, getChargingData } from './vehicles';
import { logger } from '../utils/logger';

/** MG4 X Range usable battery capacity */
const BATTERY_CAPACITY_KWH = 77;

/** Convert SOC percentage to kWh based on battery capacity */
export function socToKwh(socPct: number): number {
  return +(socPct * BATTERY_CAPACITY_KWH / 100).toFixed(3);
}

/**
 * Start a charging session for a VIN.
 * Live-fetches vehicle status + charging data to get current SOC and odometer.
 * Guards against duplicate active sessions.
 */
export async function startChargingSession(vin: string): Promise<SaicChargingSession> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);

  // Guard: only one active session per VIN
  const existing = repo.getActiveSession(vin);
  if (existing) {
    throw Object.assign(
      new Error('A charging session is already active for this vehicle'),
      { statusCode: 409 }
    );
  }

  // Live-fetch current data (car should be awake during charging)
  const [statusData, chargingData] = await Promise.all([
    getVehicleStatus(vin, true).catch(err => {
      logger.warn(`charging-sessions: failed to fetch vehicle status: ${err.message}`);
      return null;
    }),
    getChargingData(vin, true).catch(err => {
      logger.warn(`charging-sessions: failed to fetch charging data: ${err.message}`);
      return null;
    }),
  ]);

  // Extract SOC from charging data (raw * 0.1 = percentage)
  const socRaw = chargingData?.chrgMgmtData?.bmsPackSOCDsp;
  if (socRaw === undefined || socRaw === null) {
    throw new Error('Could not read current SOC from vehicle. Is the car awake?');
  }
  const socPct = +(socRaw * 0.1).toFixed(1);
  const batteryKwh = socToKwh(socPct);

  // Extract odometer from vehicle status (raw * 0.1 = km)
  const mileageRaw = statusData?.basicVehicleStatus?.mileage;
  if (mileageRaw === undefined || mileageRaw === null) {
    throw new Error('Could not read odometer from vehicle. Is the car awake?');
  }
  const odometerKm = +(mileageRaw * 0.1).toFixed(1);

  const session = repo.createChargingSession(vin, socPct, batteryKwh, odometerKm);
  logger.info(`Charging session started for VIN ${vin.slice(0, 6)}... | SOC: ${socPct}% | Odometer: ${odometerKm} km`);

  return session;
}

/**
 * Stop (complete) the active charging session for a VIN.
 * Live-fetches current data, calculates energy added and efficiency since last charge.
 */
export async function stopChargingSession(vin: string): Promise<SaicChargingSession> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);

  const active = repo.getActiveSession(vin);
  if (!active) {
    throw Object.assign(
      new Error('No active charging session for this vehicle'),
      { statusCode: 404 }
    );
  }

  // Live-fetch current data
  const [statusData, chargingData] = await Promise.all([
    getVehicleStatus(vin, true).catch(err => {
      logger.warn(`charging-sessions: failed to fetch vehicle status on stop: ${err.message}`);
      return null;
    }),
    getChargingData(vin, true).catch(err => {
      logger.warn(`charging-sessions: failed to fetch charging data on stop: ${err.message}`);
      return null;
    }),
  ]);

  // Extract end SOC
  const socRaw = chargingData?.chrgMgmtData?.bmsPackSOCDsp;
  if (socRaw === undefined || socRaw === null) {
    throw new Error('Could not read current SOC from vehicle. Is the car awake?');
  }
  const endSocPct = +(socRaw * 0.1).toFixed(1);
  const endBatteryKwh = socToKwh(endSocPct);

  // Extract end odometer
  const mileageRaw = statusData?.basicVehicleStatus?.mileage;
  if (mileageRaw === undefined || mileageRaw === null) {
    throw new Error('Could not read odometer from vehicle. Is the car awake?');
  }
  const endOdometerKm = +(mileageRaw * 0.1).toFixed(1);

  // Calculate energy added during this session
  const energyAddedKwh = +(endBatteryKwh - active.start_battery_kwh).toFixed(3);

  // Calculate distance and energy used since last completed session
  let distanceSinceLastKm: number | null = null;
  let energyUsedSinceLastKwh: number | null = null;
  let efficiencyKwhPer100km: number | null = null;

  const lastCompleted = repo.getLastCompletedSession(vin);
  if (lastCompleted?.end_odometer_km != null && lastCompleted?.end_battery_kwh != null) {
    distanceSinceLastKm = +(active.start_odometer_km - lastCompleted.end_odometer_km).toFixed(1);
    energyUsedSinceLastKwh = +(lastCompleted.end_battery_kwh - active.start_battery_kwh).toFixed(3);

    // Only calculate efficiency if meaningful distance was driven
    if (distanceSinceLastKm > 0 && energyUsedSinceLastKwh > 0) {
      efficiencyKwhPer100km = +((energyUsedSinceLastKwh / distanceSinceLastKm) * 100).toFixed(1);
    }
  }

  repo.completeChargingSession(
    active.id,
    endSocPct,
    endBatteryKwh,
    endOdometerKm,
    energyAddedKwh,
    distanceSinceLastKm,
    energyUsedSinceLastKwh,
    efficiencyKwhPer100km
  );

  logger.info(
    `Charging session completed for VIN ${vin.slice(0, 6)}... | ` +
    `SOC: ${active.start_soc_pct}% -> ${endSocPct}% | ` +
    `Energy added: ${energyAddedKwh} kWh | ` +
    `Efficiency: ${efficiencyKwhPer100km != null ? efficiencyKwhPer100km + ' kWh/100km' : 'N/A (first session)'}`
  );

  // Return the updated session
  const sessions = repo.getChargingSessions(vin, 1, 0);
  return sessions[0] || active;
}

/** List charging sessions for a VIN (paginated) */
export async function getChargingSessions(
  vin: string,
  limit = 50,
  offset = 0
): Promise<SaicChargingSession[]> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  return repo.getChargingSessions(vin, limit, offset);
}

/** Get aggregate charging stats for a VIN */
export async function getChargingStats(vin: string): Promise<SaicChargingStats> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  return repo.getChargingStats(vin);
}

/** Get the active charging session for a VIN (if any) */
export async function getActiveChargingSession(vin: string): Promise<SaicChargingSession | null> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  return repo.getActiveSession(vin);
}

/** Delete a charging session by ID */
export async function deleteChargingSession(id: number): Promise<boolean> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  return repo.deleteChargingSession(id);
}
