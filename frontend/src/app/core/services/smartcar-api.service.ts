import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AuthStatus, TokenInfo, ConnectionsListResponse, ConnectionResponse,
  VehicleResponse, SignalsListResponse, SignalResponse, SignalCatalogResponse,
  SignalSnapshot, CommandResponse, CommandLogEntry, Webhook, Subscription,
  WebhookEvent, CompatibleVehiclesResponse, Application, ApplicationSecret,
  DailySchedule, WeeklySchedule, WorkweekSchedule
} from '../models';

@Injectable({ providedIn: 'root' })
export class SmartcarApiService {
  constructor(private http: HttpClient) {}

  // Auth
  getAuthStatus(): Observable<AuthStatus> {
    return this.http.get<AuthStatus>('/auth/status');
  }

  getTokenInfo(): Observable<TokenInfo> {
    return this.http.get<TokenInfo>('/auth/token');
  }

  refreshToken(): Observable<any> {
    return this.http.post('/auth/token', {});
  }

  getConnectUrl(params?: { mode?: string; make?: string; single_select?: boolean }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.mode) httpParams = httpParams.set('mode', params.mode);
    if (params?.make) httpParams = httpParams.set('make', params.make);
    if (params?.single_select) httpParams = httpParams.set('single_select', 'true');
    return this.http.get('/auth/connect', { params: httpParams });
  }

  // Connections
  listConnections(filters?: { userId?: string; vehicleId?: string; mode?: string }, page?: number, size?: number): Observable<ConnectionsListResponse> {
    let params = new HttpParams();
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (filters?.vehicleId) params = params.set('vehicleId', filters.vehicleId);
    if (filters?.mode) params = params.set('mode', filters.mode);
    if (page) params = params.set('page', page.toString());
    if (size) params = params.set('size', size.toString());
    return this.http.get<ConnectionsListResponse>('/api/connections', { params });
  }

  getConnection(connectionId: string): Observable<ConnectionResponse> {
    return this.http.get<ConnectionResponse>(`/api/connections/${connectionId}`);
  }

  removeConnection(connectionId: string): Observable<any> {
    return this.http.delete(`/api/connections/${connectionId}`);
  }

  removeUser(userId: string): Observable<any> {
    return this.http.delete(`/api/connections/users/${userId}`);
  }

  // Vehicles
  getVehicle(vehicleId: string, userId?: string): Observable<VehicleResponse> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId);
    return this.http.get<VehicleResponse>(`/api/vehicles/${vehicleId}`, { params });
  }

  getSignals(vehicleId: string, userId: string): Observable<SignalsListResponse> {
    return this.http.get<SignalsListResponse>(`/api/vehicles/${vehicleId}/signals`, {
      headers: { 'sc-user-id': userId }
    });
  }

  getSignal(vehicleId: string, signalCode: string, userId: string): Observable<SignalResponse> {
    return this.http.get<SignalResponse>(`/api/vehicles/${vehicleId}/signals/${signalCode}`, {
      headers: { 'sc-user-id': userId }
    });
  }

  getSignalsCatalog(): Observable<SignalCatalogResponse> {
    return this.http.get<SignalCatalogResponse>('/api/vehicles/signals/catalog');
  }

  getSignalHistory(vehicleId: string, signalCode?: string): Observable<{ data: SignalSnapshot[] }> {
    let params = new HttpParams();
    if (signalCode) params = params.set('signalCode', signalCode);
    return this.http.get<{ data: SignalSnapshot[] }>(`/api/vehicles/${vehicleId}/signals-history`, { params });
  }

  // Commands - Charging
  startCharging(vehicleId: string, userId: string): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/charge/start`, {}, {
      headers: { 'sc-user-id': userId }
    });
  }

  stopCharging(vehicleId: string, userId: string): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/charge/stop`, {}, {
      headers: { 'sc-user-id': userId }
    });
  }

  setChargeLimit(vehicleId: string, userId: string, percent: number): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/charge/set-limit`, { percent }, {
      headers: { 'sc-user-id': userId }
    });
  }

  // Commands - Security
  lockDoors(vehicleId: string, userId: string): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/security/lock`, {}, {
      headers: { 'sc-user-id': userId }
    });
  }

  unlockDoors(vehicleId: string, userId: string): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/security/unlock`, {}, {
      headers: { 'sc-user-id': userId }
    });
  }

  // Commands - Navigation
  setDestination(vehicleId: string, userId: string, latitude: number, longitude: number): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/commands/navigation/set-destination`, { latitude, longitude }, {
      headers: { 'sc-user-id': userId }
    });
  }

  // Commands - Charge Schedules
  setDailySchedule(vehicleId: string, userId: string, schedule: DailySchedule): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/charge-schedules/daily`, schedule, {
      headers: { 'sc-user-id': userId }
    });
  }

  setWeeklySchedule(vehicleId: string, userId: string, schedule: WeeklySchedule): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/charge-schedules/weekly`, schedule, {
      headers: { 'sc-user-id': userId }
    });
  }

  setWorkweekSchedule(vehicleId: string, userId: string, schedule: WorkweekSchedule): Observable<CommandResponse> {
    return this.http.post<CommandResponse>(`/api/vehicles/${vehicleId}/charge-schedules/workweek`, schedule, {
      headers: { 'sc-user-id': userId }
    });
  }

  deleteChargeSchedule(vehicleId: string, userId: string, scheduleId: string): Observable<any> {
    return this.http.delete(`/api/vehicles/${vehicleId}/charge-schedules/${scheduleId}`, {
      headers: { 'sc-user-id': userId }
    });
  }

  // Command Logs
  getCommandLogs(vehicleId: string, page?: number, size?: number): Observable<{ data: CommandLogEntry[] }> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (size) params = params.set('size', size.toString());
    return this.http.get<{ data: CommandLogEntry[] }>(`/api/vehicles/${vehicleId}/command-logs`, { params });
  }

  // Webhooks
  listWebhooks(): Observable<{ data: Webhook[] }> {
    return this.http.get<{ data: Webhook[] }>('/api/webhooks');
  }

  getWebhook(webhookId: string): Observable<{ data: Webhook }> {
    return this.http.get<{ data: Webhook }>(`/api/webhooks/${webhookId}`);
  }

  // Subscriptions
  listSubscriptions(filters?: { webhookId?: string; vehicleId?: string; userId?: string }, page?: number, size?: number): Observable<{ data: Subscription[] }> {
    let params = new HttpParams();
    if (filters?.webhookId) params = params.set('webhookId', filters.webhookId);
    if (filters?.vehicleId) params = params.set('vehicleId', filters.vehicleId);
    if (filters?.userId) params = params.set('userId', filters.userId);
    if (page) params = params.set('page', page.toString());
    if (size) params = params.set('size', size.toString());
    return this.http.get<{ data: Subscription[] }>('/api/subscriptions', { params });
  }

  createSubscription(webhookId: string, userId: string, vehicleId: string): Observable<{ data: Subscription }> {
    return this.http.post<{ data: Subscription }>('/api/subscriptions', { webhookId, userId, vehicleId });
  }

  getSubscription(subscriptionId: string): Observable<{ data: Subscription }> {
    return this.http.get<{ data: Subscription }>(`/api/subscriptions/${subscriptionId}`);
  }

  removeSubscription(subscriptionId: string): Observable<any> {
    return this.http.delete(`/api/subscriptions/${subscriptionId}`);
  }

  // Webhook Events
  listWebhookEvents(limit?: number, offset?: number, eventType?: string): Observable<{ data: WebhookEvent[] }> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (offset) params = params.set('offset', offset.toString());
    if (eventType) params = params.set('eventType', eventType);
    return this.http.get<{ data: WebhookEvent[] }>('/api/webhook-events', { params });
  }

  // Compatibility
  getCompatibleVehicles(filters?: { region?: string; make?: string; powertrainType?: string }): Observable<CompatibleVehiclesResponse> {
    let params = new HttpParams();
    if (filters?.region) params = params.set('region', filters.region);
    if (filters?.make) params = params.set('make', filters.make);
    if (filters?.powertrainType) params = params.set('powertrainType', filters.powertrainType);
    return this.http.get<CompatibleVehiclesResponse>('/api/compatibility', { params });
  }

  getMgCompatibility(): Observable<CompatibleVehiclesResponse> {
    return this.http.get<CompatibleVehiclesResponse>('/api/compatibility/mg');
  }

  // Management
  listApplications(): Observable<{ data: Application[] }> {
    return this.http.get<{ data: Application[] }>('/api/management/applications');
  }

  getApplication(appId: string): Observable<{ data: Application }> {
    return this.http.get<{ data: Application }>(`/api/management/applications/${appId}`);
  }

  getApplicationSecrets(appId: string): Observable<{ data: ApplicationSecret[] }> {
    return this.http.get<{ data: ApplicationSecret[] }>(`/api/management/applications/${appId}/secrets`);
  }
}
