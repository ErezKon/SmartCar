import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { SmartcarApiService } from '../../core/services/smartcar-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProviderService } from '../../core/services/provider.service';
import { SaicApiService } from '../../core/services/saic-api.service';
import { Connection, ConnectedUser, Application, TokenInfo } from '../../core/models';
import { SaicAccountStatus, ProviderType } from '../../core/models/saic.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatListModule, MatDividerModule, MatSnackBarModule,
    MatProgressSpinnerModule, StatusBadgeComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit, OnDestroy {
  connections: Connection[] = [];
  users: ConnectedUser[] = [];
  applications: Application[] = [];
  tokenInfo: TokenInfo | null = null;
  activeProvider: ProviderType = 'smartcar';
  saicStatus: SaicAccountStatus | null = null;
  loading = { connections: false, users: false, apps: false, token: false, saic: false };
  private subs: Subscription[] = [];

  constructor(
    private api: SmartcarApiService,
    private auth: AuthService,
    private providerService: ProviderService,
    private saicApi: SaicApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.providerService.activeProvider$.subscribe(p => {
        this.activeProvider = p;
      })
    );
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAll(): void {
    this.loadConnections();
    this.loadUsers();
    this.loadApplications();
    this.loadToken();
    this.loadSaicStatus();
  }

  loadSaicStatus(): void {
    this.loading.saic = true;
    this.subs.push(
      this.saicApi.getAccountStatus().subscribe({
        next: status => { this.saicStatus = status; this.loading.saic = false; },
        error: () => { this.saicStatus = { connected: false }; this.loading.saic = false; }
      })
    );
  }

  loadConnections(): void {
    this.loading.connections = true;
    this.api.listConnections().subscribe({
      next: res => { this.connections = res.data || []; this.loading.connections = false; },
      error: () => { this.loading.connections = false; }
    });
  }

  loadUsers(): void {
    this.loading.users = true;
    this.auth.refreshStatus().subscribe({
      next: status => { this.users = status.users || []; this.loading.users = false; },
      error: () => { this.loading.users = false; }
    });
  }

  loadApplications(): void {
    this.loading.apps = true;
    this.api.listApplications().subscribe({
      next: res => { this.applications = res.data || []; this.loading.apps = false; },
      error: () => { this.loading.apps = false; }
    });
  }

  loadToken(): void {
    this.loading.token = true;
    this.api.getTokenInfo().subscribe({
      next: info => { this.tokenInfo = info; this.loading.token = false; },
      error: () => { this.loading.token = false; }
    });
  }

  refreshToken(): void {
    this.loading.token = true;
    this.api.refreshToken().subscribe({
      next: () => {
        this.snackBar.open('Token refreshed', 'OK', { duration: 3000 });
        this.loadToken();
      },
      error: (err: any) => {
        this.loading.token = false;
        this.snackBar.open(err.message || 'Failed to refresh token', 'OK', { duration: 3000 });
      }
    });
  }

  removeConnection(connectionId: string): void {
    this.api.removeConnection(connectionId).subscribe({
      next: () => {
        this.snackBar.open('Connection removed', 'OK', { duration: 3000 });
        this.loadConnections();
      },
      error: (err: any) => {
        this.snackBar.open(err.message || 'Failed to remove connection', 'OK', { duration: 3000 });
      }
    });
  }

  removeUser(userId: string): void {
    this.api.removeUser(userId).subscribe({
      next: () => {
        this.snackBar.open('User removed', 'OK', { duration: 3000 });
        this.loadUsers();
        this.loadConnections();
      },
      error: (err: any) => {
        this.snackBar.open(err.message || 'Failed to remove user', 'OK', { duration: 3000 });
      }
    });
  }

  getVehicleLabel(conn: Connection): string {
    const v = conn.attributes.vehicle;
    return v ? `${v.year} ${v.make} ${v.model}` : conn.attributes.vehicleId;
  }
}
