import { smartcarClient } from './client';
import { logger } from '../utils/logger';

export interface VehicleAttributes {
  make: string;
  model: string;
  year: number;
  powertrainType: string;
}

export interface VehicleResponse {
  data: {
    id: string;
    type: string;
    attributes: VehicleAttributes;
  };
}

export interface SignalValue {
  type: string;
  attributes: {
    code: string;
    value: unknown;
    dataAge: string | null;
    requestId?: string;
  };
}

export interface SignalsListResponse {
  data: SignalValue[];
}

export interface SignalResponse {
  data: SignalValue;
}

/**
 * Get vehicle attributes (make, model, year, powertrainType).
 *
 * @endpoint GET https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}
 * @param vehicleId - The unique vehicle identifier.
 * @returns Vehicle attributes including make, model, year, and powertrain type.
 */
export async function getVehicle(vehicleId: string): Promise<VehicleResponse> {
  logger.debug(`Getting vehicle attributes: ${vehicleId}`);
  return smartcarClient.get<VehicleResponse>(`/vehicles/${vehicleId}`);
}

/**
 * List all available signals for a vehicle.
 *
 * @endpoint GET https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/signals
 * @param vehicleId - The unique vehicle identifier.
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns Array of signal values with codes, values, and data age timestamps.
 */
export async function listSignals(
  vehicleId: string,
  userId: string
): Promise<SignalsListResponse> {
  logger.debug(`Listing all signals for vehicle: ${vehicleId}`);
  return smartcarClient.get<SignalsListResponse>(
    `/vehicles/${vehicleId}/signals`,
    { userId }
  );
}

/**
 * Get a single signal value for a vehicle.
 *
 * @endpoint GET https://vehicle.api.smartcar.com/v3/vehicles/{vehicleId}/signals/{signalCode}
 * @param vehicleId - The unique vehicle identifier.
 * @param signalCode - The signal code (e.g. `tractionbattery-stateofcharge`).
 * @param userId - The Smartcar user ID (sent as `sc-user-id` header).
 * @returns The signal value with code, current value, and data age.
 */
export async function getSignal(
  vehicleId: string,
  signalCode: string,
  userId: string
): Promise<SignalResponse> {
  logger.debug(`Getting signal ${signalCode} for vehicle: ${vehicleId}`);
  return smartcarClient.get<SignalResponse>(
    `/vehicles/${vehicleId}/signals/${signalCode}`,
    { userId }
  );
}
