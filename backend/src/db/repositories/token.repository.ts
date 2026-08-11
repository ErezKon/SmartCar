import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredToken {
  id: number;
  access_token: string;
  token_type: string;
  expires_at: number;
  created_at: string;
}

export class TokenRepository {
  constructor(private db: SqlJsDatabase) {}

  getLatestToken(): StoredToken | null {
    const stmt = this.db.prepare('SELECT * FROM tokens ORDER BY id DESC LIMIT 1');
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as StoredToken;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  saveToken(accessToken: string, expiresAt: number, tokenType = 'Bearer'): void {
    this.db.run(
      'INSERT INTO tokens (access_token, token_type, expires_at) VALUES (?, ?, ?)',
      [accessToken, tokenType, expiresAt]
    );
    saveDatabase();
  }

  deleteExpiredTokens(): void {
    const now = Math.floor(Date.now() / 1000);
    this.db.run('DELETE FROM tokens WHERE expires_at < ?', [now]);
    saveDatabase();
  }
}
