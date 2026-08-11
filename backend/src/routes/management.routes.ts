import { Router, Request, Response } from 'express';
import { listApplications, getApplication, getApplicationSecrets } from '../api/management';
import { ensureAuthenticated } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

export const managementRouter = Router();

// All management routes require authentication
managementRouter.use(ensureAuthenticated);

// GET /api/management/applications - List applications
managementRouter.get('/applications', async (_req: Request, res: Response) => {
  try {
    const result = await listApplications();
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`List applications error: ${err.message}`);
    res.status(500).json({ error: 'Failed to list applications', message: err.message });
  }
});

// GET /api/management/applications/:id - Get application details
managementRouter.get('/applications/:id', async (req: Request, res: Response) => {
  try {
    const result = await getApplication(req.params.id as string);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get application error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get application', message: err.message });
  }
});

// GET /api/management/applications/:id/secrets - List application secrets
managementRouter.get('/applications/:id/secrets', async (req: Request, res: Response) => {
  try {
    const result = await getApplicationSecrets(req.params.id as string);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get application secrets error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get application secrets', message: err.message });
  }
});
