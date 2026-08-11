import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { SmartcarApiService } from './smartcar-api.service';
import { AuthStatus, ConnectedUser } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private authStatus$ = new BehaviorSubject<AuthStatus | null>(null);
  private activeUserId$ = new BehaviorSubject<string | null>(null);
  private activeVehicleId$ = new BehaviorSubject<string | null>(null);

  readonly status$ = this.authStatus$.asObservable();
  readonly userId$ = this.activeUserId$.asObservable();
  readonly vehicleId$ = this.activeVehicleId$.asObservable();

  constructor(private api: SmartcarApiService) {
    const savedUserId = localStorage.getItem('smartcar_user_id');
    const savedVehicleId = localStorage.getItem('smartcar_vehicle_id');
    if (savedUserId) this.activeUserId$.next(savedUserId);
    if (savedVehicleId) this.activeVehicleId$.next(savedVehicleId);
  }

  refreshStatus(): Observable<AuthStatus> {
    return this.api.getAuthStatus().pipe(
      tap(status => this.authStatus$.next(status)),
      catchError(err => {
        this.authStatus$.next(null);
        return of({ token: { hasToken: false, expiresAt: null, remainingSeconds: null }, users: [], connectedUsers: 0 } as AuthStatus);
      })
    );
  }

  get currentStatus(): AuthStatus | null {
    return this.authStatus$.getValue();
  }

  get currentUserId(): string | null {
    return this.activeUserId$.getValue();
  }

  get currentVehicleId(): string | null {
    return this.activeVehicleId$.getValue();
  }

  setActiveUser(userId: string): void {
    this.activeUserId$.next(userId);
    localStorage.setItem('smartcar_user_id', userId);
  }

  setActiveVehicle(vehicleId: string): void {
    this.activeVehicleId$.next(vehicleId);
    localStorage.setItem('smartcar_vehicle_id', vehicleId);
  }

  clearActiveUser(): void {
    this.activeUserId$.next(null);
    localStorage.removeItem('smartcar_user_id');
  }

  clearActiveVehicle(): void {
    this.activeVehicleId$.next(null);
    localStorage.removeItem('smartcar_vehicle_id');
  }

  get users(): ConnectedUser[] {
    return this.authStatus$.getValue()?.users || [];
  }

  get hasToken(): boolean {
    return this.authStatus$.getValue()?.token?.hasToken || false;
  }
}
