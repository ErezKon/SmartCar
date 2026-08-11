import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredUser {
  user_id: string;
  external_id: string | null;
  created_at: string;
}

export class UserRepository {
  constructor(private db: SqlJsDatabase) {}

  getUser(userId: string): StoredUser | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE user_id = ?');
    stmt.bind([userId]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as StoredUser;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  getAllUsers(): StoredUser[] {
    const results: StoredUser[] = [];
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredUser);
    }
    stmt.free();
    return results;
  }

  upsertUser(userId: string, externalId?: string): void {
    this.db.run(
      `INSERT INTO users (user_id, external_id) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET external_id = COALESCE(excluded.external_id, users.external_id)`,
      [userId, externalId || null]
    );
    saveDatabase();
  }

  deleteUser(userId: string): void {
    this.db.run('DELETE FROM users WHERE user_id = ?', [userId]);
    saveDatabase();
  }
}
