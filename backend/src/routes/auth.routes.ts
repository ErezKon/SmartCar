import { Router, Request, Response } from 'express';
import { buildConnectUrl, handleConnectCallback, ConnectUrlOptions } from '../auth/connect';
import { getAccessToken, forceTokenRefresh, getTokenInfo } from '../auth/token-manager';
import { getDatabase } from '../db/database';
import { UserRepository } from '../db/repositories/user.repository';
import { logger } from '../utils/logger';

export const authRouter = Router();

// GET /auth/connect - Redirect user to Smartcar Connect
authRouter.get('/connect', (req: Request, res: Response) => {
  const options: ConnectUrlOptions = {};

  if (req.query.mode) options.mode = req.query.mode as 'simulated' | 'live';
  if (req.query.make) options.make = req.query.make as string;
  if (req.query.single_select === 'true') options.singleSelect = true;
  if (req.query.single_select_vin) options.singleSelectVin = req.query.single_select_vin as string;
  if (req.query.state) options.state = req.query.state as string;

  const connectUrl = buildConnectUrl(options);
  logger.info(`Redirecting to Smartcar Connect: ${connectUrl}`);
  res.redirect(connectUrl);
});

// GET /auth/callback - Handle Connect redirect
authRouter.get('/callback', async (req: Request, res: Response) => {
  try {
    const result = await handleConnectCallback({
      user_id: req.query.user_id as string | undefined,
      error: req.query.error as string | undefined,
      error_description: req.query.error_description as string | undefined,
      state: req.query.state as string | undefined,
    });

    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/connect?status=success&user_id=${result.userId}`);
  } catch (error) {
    const err = error as Error;
    logger.error(`Connect callback error: ${err.message}`);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    res.redirect(`${frontendUrl}/connect?status=error&message=${encodeURIComponent(err.message)}`);
  }
});

// GET /auth/status - Current auth status
authRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const tokenInfo = await getTokenInfo();
    const db = await getDatabase();
    const userRepo = new UserRepository(db);
    const users = userRepo.getAllUsers();

    res.json({
      token: tokenInfo,
      users: users.map((u) => ({ userId: u.user_id, externalId: u.external_id, createdAt: u.created_at })),
      connectedUsers: users.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`Auth status error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get auth status' });
  }
});

// POST /auth/token - Manually trigger token refresh
authRouter.post('/token', async (_req: Request, res: Response) => {
  try {
    const token = await forceTokenRefresh();
    const tokenInfo = await getTokenInfo();

    res.json({
      message: 'Token refreshed successfully',
      token: {
        hasToken: true,
        expiresAt: tokenInfo.expiresAt,
        remainingSeconds: tokenInfo.remainingSeconds,
        preview: `${token.substring(0, 10)}...`,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`Token refresh error: ${err.message}`);
    res.status(500).json({ error: 'Failed to refresh token', message: err.message });
  }
});

// GET /auth/token - Get current token info (no secrets)
authRouter.get('/token', async (_req: Request, res: Response) => {
  try {
    const tokenInfo = await getTokenInfo();
    res.json(tokenInfo);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ error: 'Failed to get token info', message: err.message });
  }
});
