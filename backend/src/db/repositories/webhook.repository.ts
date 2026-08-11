import { Database as SqlJsDatabase } from 'sql.js';
import { saveDatabase } from '../database';

export interface StoredWebhookEvent {
  id: number;
  event_id: string | null;
  event_type: string;
  vehicle_id: string | null;
  payload: string;
  received_at: string;
}

export class WebhookRepository {
  constructor(private db: SqlJsDatabase) {}

  getEvents(limit = 50, offset = 0): StoredWebhookEvent[] {
    const results: StoredWebhookEvent[] = [];
    const stmt = this.db.prepare('SELECT * FROM webhook_events ORDER BY received_at DESC LIMIT ? OFFSET ?');
    stmt.bind([limit, offset]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredWebhookEvent);
    }
    stmt.free();
    return results;
  }

  getEventsByType(eventType: string, limit = 50): StoredWebhookEvent[] {
    const results: StoredWebhookEvent[] = [];
    const stmt = this.db.prepare('SELECT * FROM webhook_events WHERE event_type = ? ORDER BY received_at DESC LIMIT ?');
    stmt.bind([eventType, limit]);
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as StoredWebhookEvent);
    }
    stmt.free();
    return results;
  }

  saveEvent(eventId: string | null, eventType: string, vehicleId: string | null, payload: string): void {
    this.db.run(
      'INSERT OR IGNORE INTO webhook_events (event_id, event_type, vehicle_id, payload) VALUES (?, ?, ?, ?)',
      [eventId, eventType, vehicleId, payload]
    );
    saveDatabase();
  }
}
