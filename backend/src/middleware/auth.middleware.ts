import { Request, Response, NextFunction } from 'express';
import { getAccessToken } from '../auth/token-manager';
import { logger } from '../utils/logger';

// Ensures a valid access token exists before proxying requests to Smartcar
export async function ensureAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await getAccessToken();
    next();
  } catch (error) {
    const err = error as Error;
    logger.error(`Authentication middleware error: ${err.message}`);
    res.status(401).json({
      error: 'Authentication required',
      message: 'No valid access token available. Configure SMARTCAR_CLIENT_ID and SMARTCAR_CLIENT_SECRET.',
    });
  }
}

// Extracts sc-user-id from request header or query param and attaches it to req
export function extractUserId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = (req.headers['sc-user-id'] as string) || (req.query.userId as string);

  if (!userId) {
    res.status(400).json({
      error: 'Missing user ID',
      message: 'Provide sc-user-id header or userId query parameter.',
    });
    return;
  }

  // Attach to request for downstream handlers
  (req as Request & { scUserId: string }).scUserId = userId;
  next();
}
