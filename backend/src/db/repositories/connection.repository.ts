import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredConnection {
  connection_id: string;
  user_id: string;
  vehicle_id: string | null;
  mode: string;
  created_at: string;
}

export class ConnectionRepository {
  constructor(private db: SqlJsDatabase) {}

  getConnection(connectionId: string): StoredConnection | null {
    const stmt = this.db.prepare('SELECT * FROM connections WHERE connection_id = ?');
    stmt.bind([connectionId]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as StoredConnection;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  getConnectionsByUser(userId: string): StoredConnection[] {
    const results: StoredConnection[] = [];
    const stmt = this.db.prepare('SELECT * FROM connections WHERE user_id = ? ORDER BY created_at DESC');
    stmt.bind([userId]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredConnection);
    }
    stmt.free();
    return results;
  }

  getAllConnections(): StoredConnection[] {
    const results: StoredConnection[] = [];
    const stmt = this.db.prepare('SELECT * FROM connections ORDER BY created_at DESC');
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredConnection);
    }
    stmt.free();
    return results;
  }

  upsertConnection(connectionId: string, userId: string, vehicleId?: string, mode = 'simulated'): void {
    this.db.run(
      `INSERT INTO connections (connection_id, user_id, vehicle_id, mode) VALUES (?, ?, ?, ?)
       ON CONFLICT(connection_id) DO UPDATE SET
         user_id = excluded.user_id,
         vehicle_id = COALESCE(excluded.vehicle_id, connections.vehicle_id),
         mode = excluded.mode`,
      [connectionId, userId, vehicleId || null, mode]
    );
    saveDatabase();
  }

  deleteConnection(connectionId: string): void {
    this.db.run('DELETE FROM connections WHERE connection_id = ?', [connectionId]);
    saveDatabase();
  }

  deleteByUser(userId: string): void {
    this.db.run('DELETE FROM connections WHERE user_id = ?', [userId]);
    saveDatabase();
  }
}
