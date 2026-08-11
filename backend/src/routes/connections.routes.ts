import { Router, Request, Response } from 'express';
import { listConnections, getConnection, removeConnection, removeUser } from '../api/connections';
import { ensureAuthenticated } from '../middleware/auth.middleware';
import { getDatabase } from '../db/database';
import { ConnectionRepository } from '../db/repositories/connection.repository';
import { UserRepository } from '../db/repositories/user.repository';
import { logger } from '../utils/logger';

export const connectionsRouter = Router();

// All connection routes require authentication
connectionsRouter.use(ensureAuthenticated);

// GET /api/connections - List all connections with optional filters and pagination
connectionsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters = {
      userId: req.query.userId as string | undefined,
      vehicleId: req.query.vehicleId as string | undefined,
      vehicleMode: req.query.vehicleMode as string | undefined,
      userExternalId: req.query.userExternalId as string | undefined,
    };

    const pagination = {
      pageNumber: req.query.pageNumber ? parseInt(req.query.pageNumber as string, 10) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
    };

    const result = await listConnections(filters, pagination);

    // Cache connections locally
    const db = await getDatabase();
    const connRepo = new ConnectionRepository(db);
    if (result.data) {
      for (const conn of result.data) {
        connRepo.upsertConnection(
          conn.id,
          conn.attributes.userId,
          conn.attributes.vehicleId,
          conn.attributes.vehicle?.mode
        );
      }
    }

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`List connections error: ${err.message}`);
    res.status(500).json({ error: 'Failed to list connections', message: err.message });
  }
});

// GET /api/connections/:connectionId - Get a single connection
connectionsRouter.get('/:connectionId', async (req: Request, res: Response) => {
  try {
    const connectionId = req.params.connectionId as string;
    const result = await getConnection(connectionId);

    // Cache locally
    const db = await getDatabase();
    const connRepo = new ConnectionRepository(db);
    const conn = result.data;
    connRepo.upsertConnection(
      conn.id,
      conn.attributes.userId,
      conn.attributes.vehicleId,
      conn.attributes.vehicle?.mode
    );

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error(`Get connection error: ${err.message}`);
    res.status(500).json({ error: 'Failed to get connection', message: err.message });
  }
});

// DELETE /api/connections/:connectionId - Remove a connection
connectionsRouter.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const connectionId = req.params.connectionId as string;
    await removeConnection(connectionId);

    // Remove from local cache
    const db = await getDatabase();
    const connRepo = new ConnectionRepository(db);
    connRepo.deleteConnection(connectionId);

    res.json({ message: `Connection ${connectionId} removed successfully` });
  } catch (error) {
    const err = error as Error;
    logger.error(`Remove connection error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove connection', message: err.message });
  }
});

// DELETE /api/users/:userId - Remove user and all their connections
connectionsRouter.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    await removeUser(userId);

    // Remove from local cache
    const db = await getDatabase();
    const connRepo = new ConnectionRepository(db);
    const userRepo = new UserRepository(db);
    connRepo.deleteByUser(userId);
    userRepo.deleteUser(userId);

    res.json({ message: `User ${userId} and all connections removed successfully` });
  } catch (error) {
    const err = error as Error;
    logger.error(`Remove user error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove user', message: err.message });
  }
});
