import { SaicClient, hashVin } from './client';
import { getSaicToken } from './auth';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { logger } from '../utils/logger';
import type {
  VehicleListResp, VinInfo,
  VehicleStatusResp,
  ChrgMgmtDataResp,
  MessageListResp, MessageEntity,
} from './types';

/**
 * Get an authenticated SaicClient instance.
 */
async function getClient(): Promise<{ client: SaicClient; token: string; accountId: number }> {
  const { token, region, accountId } = await getSaicToken();
  return { client: new SaicClient(region), token, accountId };
}

/**
 * List vehicles from the SAIC API and cache them locally.
 */
export async function listVehicles(): Promise<VinInfo[]> {
  const { client, token, accountId } = await getClient();

  const data = await client.request<VehicleListResp>({
    path: '/vehicle/list',
    token,
  });

  const vinList = data.vinList || [];

  // Cache vehicles locally
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  for (const v of vinList) {
    repo.upsertVehicle(
      v.vin,
      accountId,
      `${v.brandName} ${v.modelName} ${v.modelYear}`.trim() || null,
      v.name || null,
      v.vehicleModelConfiguration ? JSON.stringify(v.vehicleModelConfiguration) : null
    );
  }

  return vinList;
}

/**
 * Get vehicle status (async polling endpoint).
 * If refresh=true, sends a live wake-up request; otherwise returns cached snapshot.
 */
export async function getVehicleStatus(vin: string, refresh = false): Promise<VehicleStatusResp | null> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);

  if (!refresh) {
    // Return cached data if available
    const snapshots = repo.getLatestSnapshots(vin);
    if (snapshots.length > 0) {
      return rebuildStatusFromSnapshots(snapshots);
    }
  }

  // Live fetch with event-id polling
  const { client, token } = await getClient();
  const vinHash = hashVin(vin);

  const data = await client.request<VehicleStatusResp>({
    path: `/vehicle/status?vin=${vinHash}&vehStatusReqType=2`,
    token,
    useEventPolling: true,
  });

  // Validate and persist snapshots — only store if the response contains actual vehicle data
  if (data?.basicVehicleStatus) {
    persistVehicleStatus(repo, vin, data);
  } else {
    logger.warn(`SAIC vehicle status response for ${vin.slice(0, 6)}... missing basicVehicleStatus, skipping persistence`);
  }

  return data;
}

/**
 * Get charging management data (async polling endpoint).
 */
export async function getChargingData(vin: string, refresh = false): Promise<ChrgMgmtDataResp | null> {
  const db = await getDatabase();
  const repo = new SaicRepository(db);

  if (!refresh) {
    const snapshots = repo.getLatestSnapshots(vin);
    const chargingSnapshot = snapshots.find(s => s.field === 'saic-charging-data');
    if (chargingSnapshot?.value) {
      try {
        return JSON.parse(chargingSnapshot.value);
      } catch { /* fall through to live fetch */ }
    }
  }

  const { client, token } = await getClient();
  const vinHash = hashVin(vin);

  const data = await client.request<ChrgMgmtDataResp>({
    path: `/vehicle/charging/mgmtData?vin=${vinHash}`,
    token,
    useEventPolling: true,
  });

  // Validate and persist charging data — only store if the response contains actual charging data
  if (data?.chrgMgmtData) {
    repo.saveSnapshot(vin, 'saic-charging-data', JSON.stringify(data));
    persistChargingSnapshots(repo, vin, data);
  } else {
    logger.warn(`SAIC charging data response for ${vin.slice(0, 6)}... missing chrgMgmtData, skipping persistence`);
  }

  return data;
}

/**
 * Get messages (not an async polling endpoint).
 */
export async function getMessages(
  messageGroup: 'ALARM' | 'COMMAND' | 'NEWS' = 'ALARM',
  pageNum = 1,
  pageSize = 20
): Promise<MessageEntity[]> {
  const { client, token } = await getClient();

  const data = await client.request<MessageListResp>({
    path: `/message/list?pageNum=${pageNum}&pageSize=${pageSize}&messageGroup=${messageGroup}`,
    token,
  });

  const messages = data.messages || [];

  // Cache messages
  const db = await getDatabase();
  const repo = new SaicRepository(db);
  for (const msg of messages) {
    repo.saveMessage(
      msg.vin || null,
      String(msg.messageId),
      msg.messageType || null,
      msg.title || null,
      msg.content || null,
      msg.messageTime || null
    );
  }

  return messages;
}

// --- Snapshot persistence helpers ---

function persistVehicleStatus(repo: SaicRepository, vin: string, data: VehicleStatusResp): void {
  const fields: Array<{ field: string; value: string | null }> = [];
  const status = data.basicVehicleStatus;
  if (status) {
    const map: Record<string, unknown> = {
      'saic-battery-voltage': status.batteryVoltage,
      'saic-bonnet': status.bonnetStatus,
      'saic-boot': status.bootStatus,
      'saic-driver-door': status.driverDoor,
      'saic-passenger-door': status.passengerDoor,
      'saic-rear-left-door': status.rearLeftDoor,
      'saic-rear-right-door': status.rearRightDoor,
      'saic-driver-window': status.driverWindow,
      'saic-passenger-window': status.passengerWindow,
      'saic-rear-left-window': status.rearLeftWindow,
      'saic-rear-right-window': status.rearRightWindow,
      'saic-lock-status': status.lockStatus,
      'saic-engine-status': status.engineStatus,
      'saic-hand-brake': status.handBrake,
      'saic-exterior-temp': status.exteriorTemperature,
      'saic-interior-temp': status.interiorTemperature,
      'saic-mileage-raw': status.mileage,
      'saic-electric-range-raw': status.fuelRangeElec,
      'saic-remote-climate': status.remoteClimateStatus,
      'saic-tyre-fl': status.frontLeftTyrePressure,
      'saic-tyre-fr': status.frontRightTyrePressure,
      'saic-tyre-rl': status.rearLeftTyrePressure,
      'saic-tyre-rr': status.rearRightTyrePressure,
      'saic-sunroof': status.sunroofStatus,
      'saic-power-mode': status.powerMode,
      'saic-alarm': status.vehicleAlarmStatus,
      'saic-main-beam': status.mainBeamStatus,
      'saic-dipped-beam': status.dippedBeamStatus,
      'saic-side-light': status.sideLightStatus,
      'saic-current-journey-distance': status.currentJourneyDistance,
      'saic-current-journey-id': status.currentJourneyId,
    };
    for (const [field, value] of Object.entries(map)) {
      if (value !== undefined && value !== null) {
        fields.push({ field, value: String(value) });
      }
    }
  }

  const gps = data.gpsPosition;
  if (gps?.wayPoint?.position) {
    fields.push({ field: 'saic-latitude', value: String(gps.wayPoint.position.latitude) });
    fields.push({ field: 'saic-longitude', value: String(gps.wayPoint.position.longitude) });
    fields.push({ field: 'saic-altitude', value: String(gps.wayPoint.position.altitude) });
    fields.push({ field: 'saic-heading', value: String(gps.wayPoint.heading) });
    fields.push({ field: 'saic-speed', value: String(gps.wayPoint.speed) });
    fields.push({ field: 'saic-gps-status', value: String(gps.gpsStatus) });
  }

  if (data.statusTime) {
    fields.push({ field: 'saic-status-time', value: String(data.statusTime) });
  }

  // Save raw status JSON for full reconstruction
  fields.push({ field: 'saic-vehicle-status', value: JSON.stringify(data) });

  if (fields.length > 0) {
    repo.saveBulkSnapshots(vin, fields);
  }
}

function persistChargingSnapshots(repo: SaicRepository, vin: string, data: ChrgMgmtDataResp): void {
  const fields: Array<{ field: string; value: string | null }> = [];
  const mgmt = data.chrgMgmtData;
  if (mgmt) {
    if (mgmt.bmsPackSOCDsp !== undefined) fields.push({ field: 'saic-soc-raw', value: String(mgmt.bmsPackSOCDsp) });
    if (mgmt.bmsPackCrnt !== undefined) fields.push({ field: 'saic-charge-current-raw', value: String(mgmt.bmsPackCrnt) });
    if (mgmt.bmsPackVol !== undefined) fields.push({ field: 'saic-charge-voltage-raw', value: String(mgmt.bmsPackVol) });
    if (mgmt.bmsEstdElecRng !== undefined) fields.push({ field: 'saic-estimated-range', value: String(mgmt.bmsEstdElecRng) });
    if (mgmt.bmsChrgSts !== undefined) fields.push({ field: 'saic-charging-status', value: String(mgmt.bmsChrgSts) });
    if (mgmt.bmsOnBdChrgTrgtSOCDspCmd !== undefined) fields.push({ field: 'saic-target-soc-code', value: String(mgmt.bmsOnBdChrgTrgtSOCDspCmd) });
    if (mgmt.bmsAltngChrgCrntDspCmd !== undefined) fields.push({ field: 'saic-charge-current-limit', value: String(mgmt.bmsAltngChrgCrntDspCmd) });
    if (mgmt.chrgngRmnngTime !== undefined) fields.push({ field: 'saic-charging-remaining-min', value: String(mgmt.chrgngRmnngTime) });
    if (mgmt.ccuEleccLckCtrlDspCmd !== undefined) fields.push({ field: 'saic-charge-port-locked', value: String(mgmt.ccuEleccLckCtrlDspCmd) });
    if (mgmt.bmsPTCHeatReqDspCmd !== undefined) fields.push({ field: 'saic-battery-heating', value: String(mgmt.bmsPTCHeatReqDspCmd) });
    if (mgmt.bmsChrgSpRsn !== undefined) fields.push({ field: 'saic-charging-stop-reason', value: String(mgmt.bmsChrgSpRsn) });
  }

  // Fields from rvsChargeStatus sub-object (correct API field names)
  const rvs = data.rvsChargeStatus;
  if (rvs) {
    if (rvs.mileageOfDay !== undefined) fields.push({ field: 'saic-mileage-today', value: String(rvs.mileageOfDay) });
    if (rvs.mileageSinceLastCharge !== undefined) fields.push({ field: 'saic-mileage-since-charge', value: String(rvs.mileageSinceLastCharge) });
    if (rvs.realtimePower !== undefined) fields.push({ field: 'saic-realtime-power', value: String(rvs.realtimePower) });
    if (rvs.chargingType !== undefined) fields.push({ field: 'saic-charging-type', value: String(rvs.chargingType) });
    if (rvs.chargingDuration !== undefined) fields.push({ field: 'saic-charging-duration', value: String(rvs.chargingDuration) });
    if (rvs.powerUsageSinceLastCharge !== undefined) fields.push({ field: 'saic-energy-since-charge', value: String(rvs.powerUsageSinceLastCharge) });
    if (rvs.powerUsageOfDay !== undefined) fields.push({ field: 'saic-energy-today', value: String(rvs.powerUsageOfDay) });
    if (rvs.chargingGunState !== undefined) fields.push({ field: 'saic-charging-gun-state', value: String(rvs.chargingGunState) });
  }

  if (fields.length > 0) {
    repo.saveBulkSnapshots(vin, fields);
  }
}

/**
 * Rebuild a VehicleStatusResp from the latest snapshots.
 * Falls back to the raw JSON snapshot if available.
 */
function rebuildStatusFromSnapshots(
  snapshots: Array<{ field: string; value: string | null }>
): VehicleStatusResp | null {
  const rawSnapshot = snapshots.find(s => s.field === 'saic-vehicle-status');
  if (rawSnapshot?.value) {
    try {
      return JSON.parse(rawSnapshot.value);
    } catch { /* fall through */ }
  }
  return null;
}
