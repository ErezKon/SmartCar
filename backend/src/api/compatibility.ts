import { smartcarClient } from './client';
import { SMARTCAR_COMPATIBILITY_API_URL } from '../config/constants';
import { buildQueryString } from '../utils/helpers';
import { logger } from '../utils/logger';

// --- Types ---

export interface CompatibilityFilters {
  region?: 'US' | 'CA' | 'EUROPE';
  make?: string;
  powertrainType?: 'ICE' | 'BEV' | 'PHEV' | 'EV';
}

export interface CompatibleVehicle {
  type: string;
  attributes: {
    make: string;
    model: string;
    year: number;
    powertrainType: string;
    capabilities: string[];
  };
}

export interface CompatibleVehiclesResponse {
  data: CompatibleVehicle[];
  meta?: {
    totalItems: number;
  };
}

// --- Cache ---

interface CacheEntry {
  data: CompatibleVehiclesResponse;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (recommended by Smartcar)

function getCacheKey(filters?: CompatibilityFilters): string {
  return JSON.stringify(filters || {});
}

function getCached(key: string): CompatibleVehiclesResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: CompatibleVehiclesResponse): void {
  cache.set(key, { data, cachedAt: Date.now() });
}

// --- API ---

/**
 * Get a list of Smartcar-compatible vehicles, with optional filtering.
 * Results are cached in memory for 24 hours (recommended by Smartcar).
 *
 * @endpoint GET https://compatibility.api.smartcar.com/v3/compatible-vehicles
 * @param filters - Optional filters: region (US/CA/EUROPE), make, powertrainType (ICE/BEV/PHEV/EV).
 * @returns List of compatible vehicles with make, model, year, powertrain, and capabilities.
 * @note No authentication required - this is a public endpoint.
 */
export async function getCompatibleVehicles(
  filters?: CompatibilityFilters
): Promise<CompatibleVehiclesResponse> {
  const cacheKey = getCacheKey(filters);
  const cached = getCached(cacheKey);
  if (cached) {
    logger.debug('Returning cached compatibility data');
    return cached;
  }

  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters?.region) params['filter[region]'] = filters.region;
  if (filters?.make) params['filter[make]'] = filters.make;
  if (filters?.powertrainType) params['filter[powertrainType]'] = filters.powertrainType;

  const queryString = buildQueryString(params);
  const url = `${SMARTCAR_COMPATIBILITY_API_URL}/compatible-vehicles${queryString}`;

  logger.debug(`Fetching compatibility data: ${url}`);

  const result = await smartcarClient.request<CompatibleVehiclesResponse>({
    method: 'GET',
    path: '',
    rawUrl: url,
    noAuth: true,
  });

  setCache(cacheKey, result);
  return result;
}

/**
 * Clears the compatibility cache. Useful for forcing a fresh fetch.
 */
export function clearCompatibilityCache(): void {
  cache.clear();
  logger.debug('Compatibility cache cleared');
}
