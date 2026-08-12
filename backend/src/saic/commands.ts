import { SaicClient, hashVin } from './client';
import { getSaicToken } from './auth';
import { getDatabase } from '../db/database';
import { SaicRepository } from '../db/repositories/saic.repository';
import { logger } from '../utils/logger';
import type {
  VehicleControlReq, RvcParam, ChargingControlRequest, ChargingSettingRequest,
  ChargingScheduleRequest, BatteryHeatingScheduleRequest, AlarmSwitchesRequest, AlarmSwitch,
  UnreadMessageCountResp,
} from './types';
import { CHARGING_SCHEDULE_MODE_MAP } from './types';
import type { ChargingScheduleMode, BatteryHeatingScheduleMode } from './types';

// --- Command type codes (rvcReqType) ---

export const COMMAND_TYPES = {
  FIND_VEHICLE: '0',
  LOCK: '1',
  UNLOCK: '2',
  WINDOWS: '3',
  HEATED_SEATS: '5',
  CLIMATE: '6',
  HEATED_STEERING_WHEEL: '8',
  REAR_WINDOW_HEAT: '32',
} as const;

// --- MG4 (EH32) climate temperature mapping ---
// min=17, max=33, offset=3 => tempIdx = temp - 17 + 3
const MG4_TEMP_MIN = 17;
const MG4_TEMP_MAX = 33;
const MG4_TEMP_OFFSET = 3;

// --- Per-VIN command mutex to serialize commands ---
const vinLocks = new Map<string, Promise<unknown>>();

async function withVinLock<T>(vin: string, fn: () => Promise<T>): Promise<T> {
  const prev = vinLocks.get(vin) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  vinLocks.set(vin, next);
  try {
    return await next;
  } finally {
    if (vinLocks.get(vin) === next) {
      vinLocks.delete(vin);
    }
  }
}

// --- Helper: get authenticated client ---

async function getClient(): Promise<{ client: SaicClient; token: string }> {
  const { token, region } = await getSaicToken();
  return { client: new SaicClient(region), token };
}

// --- Helper: base64-encode a single byte value ---

function encodeParamByte(value: number): string {
  return Buffer.from([value & 0xff]).toString('base64');
}

// --- Helper: base64-encode a 4-byte (uint32) value ---

function encodeParam4Bytes(value: number): string {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf.toString('base64');
}

// --- Helper: terminator param (paramId=255, value=0x00000000) ---

function terminatorParam(): RvcParam {
  return { paramId: 255, paramValue: encodeParam4Bytes(0) };
}

// --- Helper: build VehicleControlReq ---

function buildControlRequest(vin: string, commandType: string, params: RvcParam[] | null): VehicleControlReq {
  return {
    vin: hashVin(vin),
    rvcReqType: commandType,
    rvcParams: params,
  };
}

// --- Helper: execute a command with logging ---

async function executeCommand<T>(
  vin: string,
  commandName: string,
  fn: (client: SaicClient, token: string) => Promise<T>,
  requestBody?: unknown
): Promise<{ status: string; data?: T; durationMs: number }> {
  return withVinLock(vin, async () => {
    const { client, token } = await getClient();
    const startTime = Date.now();
    const db = await getDatabase();
    const repo = new SaicRepository(db);

    try {
      const data = await fn(client, token);
      const durationMs = Date.now() - startTime;

      repo.logCommand(
        vin, commandName, 'SUCCESS',
        requestBody ? JSON.stringify(requestBody) : undefined,
        data ? JSON.stringify(data) : undefined,
        undefined, durationMs
      );

      logger.info(`SAIC command ${commandName} on ${vin.slice(0, 6)}... completed in ${durationMs}ms`);
      return { status: 'SUCCESS', data, durationMs };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error as Error;

      repo.logCommand(
        vin, commandName, 'FAILURE',
        requestBody ? JSON.stringify(requestBody) : undefined,
        JSON.stringify({ error: err.message }),
        undefined, durationMs
      );

      logger.error(`SAIC command ${commandName} failed: ${err.message}`);
      throw error;
    }
  });
}

// ========================
// Vehicle Control Commands
// ========================

/**
 * Find My Car (horn + lights).
 */
export async function findVehicle(vin: string, enable = true): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 1, paramValue: encodeParamByte(enable ? 0x01 : 0x00) },
    { paramId: 2, paramValue: encodeParamByte(0x01) }, // horn
    { paramId: 3, paramValue: encodeParamByte(0x01) }, // lights
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.FIND_VEHICLE, params);

  return executeCommand(vin, 'findVehicle', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Lock the vehicle.
 */
export async function lock(vin: string): Promise<{ status: string; durationMs: number }> {
  const body = buildControlRequest(vin, COMMAND_TYPES.LOCK, null);

  return executeCommand(vin, 'lock', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Unlock the vehicle.
 * lockId: 3 = doors, 2 = tailgate
 */
export async function unlock(vin: string, lockId = 3): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 4, paramValue: encodeParamByte(0x00) },
    { paramId: 5, paramValue: encodeParamByte(0x00) },
    { paramId: 6, paramValue: encodeParamByte(0x00) },
    { paramId: 7, paramValue: encodeParamByte(lockId) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.UNLOCK, params);

  return executeCommand(vin, 'unlock', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Start climate control (AC on).
 * temperature: target temp in Celsius (17-33 for MG4).
 * fanSpeed: 0=off, 1=low, 2=med, 3=high, 5=defrost
 */
export async function startClimate(
  vin: string,
  temperature = 22,
  fanSpeed = 2
): Promise<{ status: string; durationMs: number }> {
  const clampedTemp = Math.max(MG4_TEMP_MIN, Math.min(MG4_TEMP_MAX, temperature));
  const tempIdx = clampedTemp - MG4_TEMP_MIN + MG4_TEMP_OFFSET;

  const params: RvcParam[] = [
    { paramId: 19, paramValue: encodeParamByte(fanSpeed) },
    { paramId: 20, paramValue: encodeParamByte(tempIdx) },
    { paramId: 22, paramValue: encodeParamByte(0x01) }, // AC on
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.CLIMATE, params);

  return executeCommand(vin, 'startClimate', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Stop climate control (AC off, fan off).
 */
export async function stopClimate(vin: string): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 19, paramValue: encodeParamByte(0x00) }, // fan off
    { paramId: 20, paramValue: encodeParamByte(MG4_TEMP_OFFSET) }, // default temp idx
    { paramId: 22, paramValue: encodeParamByte(0x00) }, // AC off
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.CLIMATE, params);

  return executeCommand(vin, 'stopClimate', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Set heated seats level.
 * driverLevel/passengerLevel: 0 (off) to 3 (max).
 */
export async function setHeatedSeats(
  vin: string,
  driverLevel = 0,
  passengerLevel = 0
): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 17, paramValue: encodeParamByte(Math.max(0, Math.min(3, driverLevel))) },
    { paramId: 18, paramValue: encodeParamByte(Math.max(0, Math.min(3, passengerLevel))) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.HEATED_SEATS, params);

  return executeCommand(vin, 'heatedSeats', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Control rear window heater.
 */
export async function setRearWindowHeat(
  vin: string,
  enable: boolean
): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 23, paramValue: encodeParamByte(enable ? 0x01 : 0x00) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.REAR_WINDOW_HEAT, params);

  return executeCommand(vin, 'rearWindowHeat', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

// ========================
// Charging Control Commands
// ========================

/**
 * Start charging.
 */
export async function startCharging(vin: string): Promise<{ status: string; durationMs: number }> {
  const body: ChargingControlRequest = {
    vin: hashVin(vin),
    chrgCtrlReq: 1, // start
    tboxV2XReq: 0,
    tboxEleccLckCtrlReq: 0,
  };

  return executeCommand(vin, 'startCharging', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Stop charging.
 */
export async function stopCharging(vin: string): Promise<{ status: string; durationMs: number }> {
  const body: ChargingControlRequest = {
    vin: hashVin(vin),
    chrgCtrlReq: 2, // stop
    tboxV2XReq: 0,
    tboxEleccLckCtrlReq: 0,
  };

  return executeCommand(vin, 'stopCharging', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Set charge limit (target SOC).
 * percent: 40, 50, 60, 70, 80, 90, or 100
 */
export async function setChargeLimit(vin: string, percent: number): Promise<{ status: string; durationMs: number }> {
  // Map percent to SOC code: 1=40%, 2=50%, ... 7=100%
  const percentToCode: Record<number, number> = {
    40: 1, 50: 2, 60: 3, 70: 4, 80: 5, 90: 6, 100: 7,
  };
  const socCode = percentToCode[percent];
  if (!socCode) {
    throw new Error(`Invalid charge limit: ${percent}%. Must be one of: 40, 50, 60, 70, 80, 90, 100`);
  }

  const body: ChargingSettingRequest = {
    vin: hashVin(vin),
    onBdChrgTrgtSOCReq: socCode,
    altngChrgCrntReq: 0, // no change
    tboxV2XSpSOCReq: 0,
  };

  return executeCommand(vin, 'setChargeLimit', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/setting',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Set charge current limit.
 * current: '6A', '8A', '16A', or 'Max'
 */
export async function setChargeCurrent(vin: string, current: string): Promise<{ status: string; durationMs: number }> {
  const currentToCode: Record<string, number> = {
    '6A': 1, '8A': 2, '16A': 3, 'Max': 4,
  };
  const crntCode = currentToCode[current];
  if (!crntCode) {
    throw new Error(`Invalid charge current: "${current}". Must be one of: 6A, 8A, 16A, Max`);
  }

  const body: ChargingSettingRequest = {
    vin: hashVin(vin),
    onBdChrgTrgtSOCReq: 0, // no change
    altngChrgCrntReq: crntCode,
    tboxV2XSpSOCReq: 0,
  };

  return executeCommand(vin, 'setChargeCurrent', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/setting',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Toggle battery heating.
 * enable: true to start, false to stop.
 */
export async function setBatteryHeating(vin: string, enable: boolean): Promise<{ status: string; durationMs: number }> {
  const body = {
    vin: hashVin(vin),
    ptcHeatReq: enable ? 1 : 2,
  };

  return executeCommand(vin, 'batteryHeating', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/ptcHeat',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

// ========================
// Phase 2: New Vehicle Control Commands
// ========================

/** Climate mode for startClimateWithMode. */
export type ClimateMode = 'ac' | 'front' | 'blowing';

/**
 * Start climate control with a specific mode.
 * - 'ac': normal A/C (default, same as startClimate)
 * - 'front': front defrost only
 * - 'blowing': fan only, no compressor
 */
export async function startClimateWithMode(
  vin: string,
  mode: ClimateMode = 'ac',
  temperature = 22,
  fanSpeed = 2
): Promise<{ status: string; durationMs: number }> {
  const clampedTemp = Math.max(MG4_TEMP_MIN, Math.min(MG4_TEMP_MAX, temperature));
  const tempIdx = clampedTemp - MG4_TEMP_MIN + MG4_TEMP_OFFSET;

  let modeValue: number;
  let acOn: number;
  switch (mode) {
    case 'front':
      modeValue = 5; // front defrost mode
      acOn = 0x00;
      break;
    case 'blowing':
      modeValue = fanSpeed;
      acOn = 0x00; // no compressor
      break;
    case 'ac':
    default:
      modeValue = fanSpeed;
      acOn = 0x01;
      break;
  }

  const params: RvcParam[] = [
    { paramId: 19, paramValue: encodeParamByte(modeValue) },
    { paramId: 20, paramValue: encodeParamByte(tempIdx) },
    { paramId: 22, paramValue: encodeParamByte(acOn) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.CLIMATE, params);

  return executeCommand(vin, `startClimate:${mode}`, (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Set front window defroster on/off.
 * Uses climate rvcReqType with front-defrost mode (paramId 19 = 5).
 */
export async function setFrontDefrost(
  vin: string,
  enable: boolean
): Promise<{ status: string; durationMs: number }> {
  if (enable) {
    return startClimateWithMode(vin, 'front');
  }
  return stopClimate(vin);
}

/**
 * Control all windows.
 * action: 'close' = 0, 'ventilate' = 1, 'open' = 2
 */
export async function controlWindows(
  vin: string,
  action: 'close' | 'ventilate' | 'open'
): Promise<{ status: string; durationMs: number }> {
  const actionMap: Record<string, number> = { close: 0, ventilate: 1, open: 2 };
  const actionValue = actionMap[action];

  const params: RvcParam[] = [
    { paramId: 13, paramValue: encodeParamByte(actionValue) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.WINDOWS, params);

  return executeCommand(vin, `windows:${action}`, (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Control sunroof.
 * action: 'close' = 0, 'open' = 1
 */
export async function controlSunroof(
  vin: string,
  action: 'close' | 'open'
): Promise<{ status: string; durationMs: number }> {
  const actionValue = action === 'open' ? 1 : 0;

  const params: RvcParam[] = [
    { paramId: 25, paramValue: encodeParamByte(actionValue) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.WINDOWS, params);

  return executeCommand(vin, `sunroof:${action}`, (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Control heated steering wheel.
 * enable: true to turn on, false to turn off.
 */
export async function setHeatedSteeringWheel(
  vin: string,
  enable: boolean
): Promise<{ status: string; durationMs: number }> {
  const params: RvcParam[] = [
    { paramId: 24, paramValue: encodeParamByte(enable ? 0x01 : 0x00) },
    terminatorParam(),
  ];
  const body = buildControlRequest(vin, COMMAND_TYPES.HEATED_STEERING_WHEEL, params);

  return executeCommand(vin, 'heatedSteeringWheel', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Lock or unlock the charging cable.
 * lock: true to lock, false to unlock.
 */
export async function setChargingCableLock(
  vin: string,
  lock: boolean
): Promise<{ status: string; durationMs: number }> {
  const body: ChargingControlRequest = {
    vin: hashVin(vin),
    chrgCtrlReq: 0, // no charge action
    tboxV2XReq: 0,
    tboxEleccLckCtrlReq: lock ? 1 : 2,
  };

  return executeCommand(vin, 'chargingCableLock', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/control',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

// ========================
// Phase 3: Charging & Battery Heating Schedules
// ========================

/**
 * Parse "HH:MM" time string and validate it.
 * Returns { hours, minutes } or throws on invalid format.
 */
function parseTimeString(time: string): { hours: number; minutes: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error(`Invalid time format: "${time}". Expected "HH:MM".`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: "${time}". Hours must be 0-23, minutes 0-59.`);
  }
  return { hours, minutes };
}

/**
 * Set charging schedule.
 * startTime/endTime: "HH:MM" format
 * mode: 'disabled', 'until_target_soc', or 'until_scheduled_time'
 */
export async function setChargingSchedule(
  vin: string,
  startTime: string,
  endTime: string,
  mode: ChargingScheduleMode
): Promise<{ status: string; durationMs: number }> {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);
  const modeCode = CHARGING_SCHEDULE_MODE_MAP[mode];
  if (modeCode === undefined) {
    throw new Error(`Invalid charging schedule mode: "${mode}". Must be: disabled, until_target_soc, until_scheduled_time`);
  }

  const body: ChargingScheduleRequest = {
    vin: hashVin(vin),
    startTime: `${String(start.hours).padStart(2, '0')}:${String(start.minutes).padStart(2, '0')}`,
    endTime: `${String(end.hours).padStart(2, '0')}:${String(end.minutes).padStart(2, '0')}`,
    mode: modeCode,
  };

  return executeCommand(vin, 'chargingSchedule', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/schedule',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

/**
 * Set battery heating schedule.
 * startTime: "HH:MM" format
 * mode: 'on' or 'off'
 */
export async function setBatteryHeatingSchedule(
  vin: string,
  startTime: string,
  mode: BatteryHeatingScheduleMode
): Promise<{ status: string; durationMs: number }> {
  const start = parseTimeString(startTime);
  const modeCode = mode === 'on' ? 1 : 0;

  const body: BatteryHeatingScheduleRequest = {
    vin: hashVin(vin),
    startTime: `${String(start.hours).padStart(2, '0')}:${String(start.minutes).padStart(2, '0')}`,
    mode: modeCode,
  };

  return executeCommand(vin, 'batteryHeatingSchedule', (client, token) =>
    client.request({
      method: 'POST',
      path: '/vehicle/charging/batteryHeatingSchedule',
      body,
      token,
      useEventPolling: true,
      commandMode: true,
    })
  , body);
}

// ========================
// Phase 4: Alarm/Notification Configuration
// ========================

/**
 * Configure alarm notification switches.
 * Requires the user's PIN for authentication.
 */
export async function setAlarmSwitches(
  vin: string,
  pin: string,
  switches: AlarmSwitch[]
): Promise<{ status: string; durationMs: number }> {
  if (!pin || pin.length < 4) {
    throw new Error('PIN is required and must be at least 4 characters.');
  }
  if (!switches || switches.length === 0) {
    throw new Error('At least one alarm switch must be provided.');
  }

  // Validate alarm setting types
  for (const sw of switches) {
    if (sw.alarmSettingType < 0 || sw.alarmSettingType > 6) {
      throw new Error(`Invalid alarmSettingType: ${sw.alarmSettingType}. Must be 0-6.`);
    }
  }

  const body: AlarmSwitchesRequest = {
    vin: hashVin(vin),
    pin,
    alarmSwitchList: switches,
  };

  return executeCommand(vin, 'alarmSwitches', (client, token) =>
    client.request({
      method: 'POST',
      path: '/alarm/switches',
      body,
      token,
      useEventPolling: false,
    })
  , { ...body, pin: '***' }); // redact PIN from command log
}

/**
 * Get unread message count by category.
 */
export async function getUnreadMessageCount(): Promise<UnreadMessageCountResp> {
  const { client, token } = await getClient();

  return client.request<UnreadMessageCountResp>({
    path: '/message/unreadCount',
    token,
  });
}

// --- Payload construction exports (for testing) ---

export const _internal = {
  encodeParamByte,
  encodeParam4Bytes,
  terminatorParam,
  buildControlRequest,
  parseTimeString,
  MG4_TEMP_MIN,
  MG4_TEMP_MAX,
  MG4_TEMP_OFFSET,
};
