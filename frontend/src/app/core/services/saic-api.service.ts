import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SaicAccountStatus, SaicConnectResponse, SaicVinInfo,
  SaicVehicleStatusResp, SaicChrgMgmtDataResp,
  SaicNormalizedSignal, SaicMessage, SaicUnreadMessageCount,
  SaicCommandResult, SaicCommandLogEntry, SaicStateSnapshot,
  SaicSettings, SaicChargingSession, SaicChargingStats,
} from '../models/saic.models';

@Injectable({ providedIn: 'root' })
export class SaicApiService {
  constructor(private http: HttpClient) {}

  // Settings
  getSettings(): Observable<SaicSettings> {
    return this.http.get<SaicSettings>('/api/saic/settings');
  }

  // Account
  getAccountStatus(): Observable<SaicAccountStatus> {
    return this.http.get<SaicAccountStatus>('/api/saic/account');
  }

  connectAccount(username: string, password: string, region: string): Observable<SaicConnectResponse> {
    return this.http.post<SaicConnectResponse>('/api/saic/account', { username, password, region });
  }

  disconnectAccount(): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>('/api/saic/account');
  }

  // Vehicles
  listVehicles(): Observable<{ data: SaicVinInfo[] }> {
    return this.http.get<{ data: SaicVinInfo[] }>('/api/saic/vehicles');
  }

  getVehicleStatus(vin: string, refresh = false): Observable<{ data: SaicVehicleStatusResp | null; cached: boolean }> {
    let params = new HttpParams();
    if (refresh) params = params.set('refresh', 'true');
    return this.http.get<{ data: SaicVehicleStatusResp | null; cached: boolean }>(`/api/saic/vehicles/${vin}/status`, { params });
  }

  getChargingData(vin: string, refresh = false): Observable<{ data: SaicChrgMgmtDataResp | null; cached: boolean }> {
    let params = new HttpParams();
    if (refresh) params = params.set('refresh', 'true');
    return this.http.get<{ data: SaicChrgMgmtDataResp | null; cached: boolean }>(`/api/saic/vehicles/${vin}/charging`, { params });
  }

  getSignals(vin: string, refresh = false): Observable<{ data: SaicNormalizedSignal[]; count: number; cached: boolean }> {
    let params = new HttpParams();
    if (refresh) params = params.set('refresh', 'true');
    return this.http.get<{ data: SaicNormalizedSignal[]; count: number; cached: boolean }>(`/api/saic/vehicles/${vin}/signals`, { params });
  }

  getHistory(vin: string, field?: string, limit?: number): Observable<{ data: SaicStateSnapshot[] }> {
    let params = new HttpParams();
    if (field) params = params.set('field', field);
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<{ data: SaicStateSnapshot[] }>(`/api/saic/vehicles/${vin}/history`, { params });
  }

  // Commands
  executeCommand(vin: string, command: string, body?: Record<string, unknown>): Observable<{ data: SaicCommandResult; command: string; vin: string }> {
    return this.http.post<{ data: SaicCommandResult; command: string; vin: string }>(
      `/api/saic/vehicles/${vin}/commands/${command}`, body || {}
    );
  }

  getCommandLogs(vin: string, limit?: number, offset?: number): Observable<{ data: SaicCommandLogEntry[] }> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (offset) params = params.set('offset', offset.toString());
    return this.http.get<{ data: SaicCommandLogEntry[] }>(`/api/saic/vehicles/${vin}/commands`, { params });
  }

  // Messages
  getMessages(group = 'ALARM', pageNum = 1, pageSize = 20): Observable<{ data: SaicMessage[] }> {
    const params = new HttpParams()
      .set('group', group)
      .set('pageNum', pageNum.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<{ data: SaicMessage[] }>('/api/saic/messages', { params });
  }

  getUnreadMessageCount(): Observable<{ data: SaicUnreadMessageCount }> {
    return this.http.get<{ data: SaicUnreadMessageCount }>('/api/saic/messages/unreadCount');
  }

  // Charging Sessions
  startChargingSession(vin: string): Observable<{ data: SaicChargingSession }> {
    return this.http.post<{ data: SaicChargingSession }>(`/api/saic/vehicles/${vin}/charging-sessions/start`, {});
  }

  stopChargingSession(vin: string): Observable<{ data: SaicChargingSession }> {
    return this.http.post<{ data: SaicChargingSession }>(`/api/saic/vehicles/${vin}/charging-sessions/stop`, {});
  }

  getChargingSessions(vin: string, limit?: number, offset?: number): Observable<{ data: SaicChargingSession[]; hasActiveSession: boolean }> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (offset) params = params.set('offset', offset.toString());
    return this.http.get<{ data: SaicChargingSession[]; hasActiveSession: boolean }>(`/api/saic/vehicles/${vin}/charging-sessions`, { params });
  }

  getChargingStats(vin: string): Observable<{ data: SaicChargingStats }> {
    return this.http.get<{ data: SaicChargingStats }>(`/api/saic/vehicles/${vin}/charging-sessions/stats`);
  }

  deleteChargingSession(vin: string, id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`/api/saic/vehicles/${vin}/charging-sessions/${id}`);
  }
}
