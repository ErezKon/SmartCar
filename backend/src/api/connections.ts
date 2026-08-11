import { smartcarClient } from './client';
import { buildQueryString } from '../utils/helpers';
import { logger } from '../utils/logger';

export interface ConnectionFilters {
  userId?: string;
  vehicleId?: string;
  vehicleMode?: string;
  userExternalId?: string;
}

export interface PaginationOptions {
  pageNumber?: number;
  pageSize?: number;
}

export interface Connection {
  id: string;
  type: string;
  attributes: {
    userId: string;
    vehicleId: string;
    createdAt: string;
    vehicle: {
      make: string;
      model: string;
      year: number;
      mode: string;
    };
  };
}

export interface ConnectionsListResponse {
  data: Connection[];
  meta?: {
    page: {
      number: number;
      size: number;
      totalPages: number;
      totalItems: number;
    };
  };
}

export interface ConnectionResponse {
  data: Connection;
}

/**
 * List all vehicle connections for the application.
 *
 * @endpoint GET https://vehicle.api.smartcar.com/v3/connections
 * @param filters - Optional filters: userId, vehicleId, vehicleMode, userExternalId.
 * @param pagination - Optional page number and size.
 * @returns Paginated list of connections with vehicle metadata.
 */
export async function listConnections(
  filters?: ConnectionFilters,
  pagination?: PaginationOptions
): Promise<ConnectionsListResponse> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters?.userId) params['filter[userId]'] = filters.userId;
  if (filters?.vehicleId) params['filter[vehicleId]'] = filters.vehicleId;
  if (filters?.vehicleMode) params['filter[vehicle.mode]'] = filters.vehicleMode;
  if (filters?.userExternalId) params['filter[userExternalId]'] = filters.userExternalId;
  if (pagination?.pageNumber) params['page[number]'] = pagination.pageNumber;
  if (pagination?.pageSize) params['page[size]'] = pagination.pageSize;

  const queryString = buildQueryString(params);
  logger.debug(`Listing connections with filters: ${JSON.stringify(filters)}`);

  return smartcarClient.get<ConnectionsListResponse>(`/connections${queryString}`);
}

/**
 * Get a specific vehicle connection by ID.
 *
 * @endpoint GET https://vehicle.api.smartcar.com/v3/connections/{connectionId}
 * @param connectionId - The unique connection identifier.
 * @returns Connection details including vehicle make/model/year and mode.
 */
export async function getConnection(connectionId: string): Promise<ConnectionResponse> {
  logger.debug(`Getting connection: ${connectionId}`);
  return smartcarClient.get<ConnectionResponse>(`/connections/${connectionId}`);
}

/**
 * Remove a specific vehicle connection.
 *
 * @endpoint DELETE https://vehicle.api.smartcar.com/v3/connections/{connectionId}
 * @param connectionId - The unique connection identifier to remove.
 */
export async function removeConnection(connectionId: string): Promise<void> {
  logger.info(`Removing connection: ${connectionId}`);
  await smartcarClient.delete(`/connections/${connectionId}`);
}

/**
 * Remove a user and all their vehicle connections.
 *
 * @endpoint DELETE https://vehicle.api.smartcar.com/v3/users/{userId}
 * @param userId - The Smartcar user ID to remove.
 */
export async function removeUser(userId: string): Promise<void> {
  logger.info(`Removing user and all connections: ${userId}`);
  await smartcarClient.delete(`/users/${userId}`);
}
