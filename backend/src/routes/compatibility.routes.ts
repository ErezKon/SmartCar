import { Router, Request, Response } from 'express';
import { getCompatibleVehicles, clearCompatibilityCache, CompatibilityFilters } from '../api/compatibility';
import { logger } from '../utils/logger';

export const compatibilityRouter = Router();

// GET /api/compatibility - Get compatible vehicles with optional filters
compatibilityRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters: CompatibilityFilters = {};

    if (req.query.region) filters.region = req.query.region as CompatibilityFilters['region'];
    if (req.query.make) filters.make = req.query.make as string;
    if (req.query.powertrainType) filters.powertrainType = req.query.powertrainType as CompatibilityFilters['powertrainType'];

    const result = await getCompatibleVehicles(
      Object.keys(filters).length > 0 ? filters : undefined
    );

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Compatibility check error: ${err.message}`);
    res.status(500).json({ error: 'Failed to check compatibility', message: err.message });
  }
});

// GET /api/compatibility/mg - Pre-filtered for MG brand (BEV)
compatibilityRouter.get('/mg', async (_req: Request, res: Response) => {
  try {
    const result = await getCompatibleVehicles({
      make: 'MG',
      powertrainType: 'BEV',
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`MG compatibility check error: ${err.message}`);
    res.status(500).json({ error: 'Failed to check MG compatibility', message: err.message });
  }
});

// POST /api/compatibility/clear-cache - Clear the compatibility cache
compatibilityRouter.post('/clear-cache', (_req: Request, res: Response) => {
  clearCompatibilityCache();
  res.json({ status: 'cache cleared' });
});
