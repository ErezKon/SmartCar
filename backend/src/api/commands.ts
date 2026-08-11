import { smartcarClient } from './client';
import { logger } from '../utils/logger';
import {
  CommandResponse,
  ScheduleExecutionResponse,
  SetChargeLimitRequest,
  SetDestinationRequest,
  DailyScheduleRequest,
  WeeklyScheduleRequest,
  WorkweekScheduleRequest,
} from './types/commands';

const VEHICLES_PATH = '/vehicles';

// --- Charging Commands ---

/**
 * Start charging the vehicle.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/charge/start
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function startCharging(
  vehicleId: string,
  userId: string
): Promise<CommandResponse> {
  logger.info(`Starting charge for vehicle: ${vehicleId}`);
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/charge/start`,
    undefined,
    { userId }
  );
}

/**
 * Stop charging the vehicle.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/charge/stop
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function stopCharging(
  vehicleId: string,
  userId: string
): Promise<CommandResponse> {
  logger.info(`Stopping charge for vehicle: ${vehicleId}`);
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/charge/stop`,
    undefined,
    { userId }
  );
}

/**
 * Set the charge limit percentage.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/charge/set-limit
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param percent - Target charge limit, 0-100.
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function setChargeLimit(
  vehicleId: string,
  userId: string,
  percent: number
): Promise<CommandResponse> {
  logger.info(`Setting charge limit to ${percent}% for vehicle: ${vehicleId}`);
  const body: SetChargeLimitRequest = {
    data: { attributes: { percent } },
  };
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/charge/set-limit`,
    body,
    { userId }
  );
}

// --- Security Commands ---

/**
 * Lock all vehicle doors.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/security/lock
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function lockDoors(
  vehicleId: string,
  userId: string
): Promise<CommandResponse> {
  logger.info(`Locking doors for vehicle: ${vehicleId}`);
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/security/lock`,
    undefined,
    { userId }
  );
}

/**
 * Unlock all vehicle doors.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/security/unlock
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function unlockDoors(
  vehicleId: string,
  userId: string
): Promise<CommandResponse> {
  logger.info(`Unlocking doors for vehicle: ${vehicleId}`);
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/security/unlock`,
    undefined,
    { userId }
  );
}

// --- Navigation Commands ---

/**
 * Set a navigation destination on the vehicle.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/commands/navigation/set-destination
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param latitude - Destination latitude (-90 to 90).
 * @param longitude - Destination longitude (-180 to 180).
 * @returns Command result with SUCCESS, FAILURE, or PENDING status.
 */
export async function setDestination(
  vehicleId: string,
  userId: string,
  latitude: number,
  longitude: number
): Promise<CommandResponse> {
  logger.info(`Setting destination (${latitude}, ${longitude}) for vehicle: ${vehicleId}`);
  const body: SetDestinationRequest = {
    data: { attributes: { latitude, longitude } },
  };
  return smartcarClient.post<CommandResponse>(
    `${VEHICLES_PATH}/${vehicleId}/commands/navigation/set-destination`,
    body,
    { userId }
  );
}

// --- Charge Schedule Commands ---

/**
 * Set a daily charge schedule.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/charge-schedules/daily
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param schedule - Daily schedule with startTime, endTime (HH:mm), and optional targetSoc.
 * @returns Schedule execution response with schedule ID on success.
 */
export async function setDailySchedule(
  vehicleId: string,
  userId: string,
  schedule: DailyScheduleRequest
): Promise<ScheduleExecutionResponse> {
  logger.info(`Setting daily charge schedule for vehicle: ${vehicleId}`);
  return smartcarClient.post<ScheduleExecutionResponse>(
    `${VEHICLES_PATH}/${vehicleId}/charge-schedules/daily`,
    schedule,
    { userId }
  );
}

/**
 * Set a weekly charge schedule with per-day configuration.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/charge-schedules/weekly
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param schedule - Weekly schedule with per-day start/end times and optional targetSoc.
 * @returns Schedule execution response with schedule ID on success.
 */
export async function setWeeklySchedule(
  vehicleId: string,
  userId: string,
  schedule: WeeklyScheduleRequest
): Promise<ScheduleExecutionResponse> {
  logger.info(`Setting weekly charge schedule for vehicle: ${vehicleId}`);
  return smartcarClient.post<ScheduleExecutionResponse>(
    `${VEHICLES_PATH}/${vehicleId}/charge-schedules/weekly`,
    schedule,
    { userId }
  );
}

/**
 * Set a workweek charge schedule with separate weekday/weekend times.
 *
 * @endpoint POST https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/charge-schedules/workweek
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param schedule - Workweek schedule with weekday/weekend start/end times and optional targetSoc.
 * @returns Schedule execution response with schedule ID on success.
 */
export async function setWorkweekSchedule(
  vehicleId: string,
  userId: string,
  schedule: WorkweekScheduleRequest
): Promise<ScheduleExecutionResponse> {
  logger.info(`Setting workweek charge schedule for vehicle: ${vehicleId}`);
  return smartcarClient.post<ScheduleExecutionResponse>(
    `${VEHICLES_PATH}/${vehicleId}/charge-schedules/workweek`,
    schedule,
    { userId }
  );
}

/**
 * Delete a charge schedule.
 *
 * @endpoint DELETE https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/charge-schedules/{scheduleId}
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @param scheduleId - The schedule identifier to delete.
 */
export async function deleteChargeSchedule(
  vehicleId: string,
  userId: string,
  scheduleId: string
): Promise<void> {
  logger.info(`Deleting charge schedule ${scheduleId} for vehicle: ${vehicleId}`);
  await smartcarClient.delete(
    `${VEHICLES_PATH}/${vehicleId}/charge-schedules/${scheduleId}`,
    { userId }
  );
}
