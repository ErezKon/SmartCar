import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';
import { SmartcarApiService } from '../../../core/services/smartcar-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SignalValue, VehicleAttributes } from '../../../core/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CommandButtonComponent } from '../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatGridListModule,
    MatDividerModule, StatusBadgeComponent, CommandButtonComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  vehicle: VehicleAttributes | null = null;
  vehicleId: string | null = null;
  userId: string | null = null;
  signals: Map<string, any> = new Map();
  loading = true;
  error: string | null = null;
  lockStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  unlockStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  chargeStartStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  chargeStopStatus: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  private subs: Subscription[] = [];

  constructor(
    private api: SmartcarApiService,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.auth.vehicleId$.subscribe(id => {
        this.vehicleId = id;
        if (id) this.loadData();
      }),
      this.auth.userId$.subscribe(id => {
        this.userId = id;
        if (id && this.vehicleId) this.loadData();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadData(): void {
    if (!this.vehicleId || !this.userId) {
      this.loading = false;
      this.error = 'No vehicle or user selected. Connect a vehicle first.';
      return;
    }
    this.loading = true;
    this.error = null;

    this.api.getVehicle(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.vehicle = res.data.attributes;
      },
      error: err => {
        this.error = err.message || 'Failed to load vehicle';
      }
    });

    this.api.getSignals(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.signals.clear();
        (res.data || []).forEach((s: SignalValue) => {
          this.signals.set(s.attributes.code, s.attributes.value);
        });
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.error = err.message || 'Failed to load signals';
      }
    });
  }

  getSignal(code: string): any {
    return this.signals.get(code) ?? 'N/A';
  }

  get batteryLevel(): number {
    const val = this.signals.get('tractionbattery-stateofcharge');
    return typeof val === 'number' ? val : 0;
  }

  get range(): string {
    const val = this.signals.get('tractionbattery-range');
    return val != null ? `${val} km` : 'N/A';
  }

  get isCharging(): boolean {
    return this.signals.get('charge-ischarging') === true;
  }

  get isLocked(): boolean {
    return this.signals.get('closure-islocked') === true;
  }

  get odometer(): string {
    const val = this.signals.get('odometer-traveleddistance');
    return val != null ? `${Number(val).toLocaleString()} km` : 'N/A';
  }

  get externalTemp(): string {
    const val = this.signals.get('climate-externaltemperature');
    return val != null ? `${val} C` : 'N/A';
  }

  get internalTemp(): string {
    const val = this.signals.get('climate-internaltemperature');
    return val != null ? `${val} C` : 'N/A';
  }

  get location(): string {
    const val = this.signals.get('location-preciselocation');
    if (val && typeof val === 'object' && val.latitude && val.longitude) {
      return `${val.latitude.toFixed(4)}, ${val.longitude.toFixed(4)}`;
    }
    return 'N/A';
  }

  get chargeRate(): string {
    const val = this.signals.get('charge-chargerate');
    return val != null ? `${val} kW` : 'N/A';
  }

  lockDoors(): void {
    if (!this.vehicleId || !this.userId) return;
    this.lockStatus = 'loading';
    this.api.lockDoors(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.lockStatus = res.data.attributes.status === 'SUCCESS' ? 'success' : 'error';
        this.snackBar.open('Doors locked', 'OK', { duration: 3000 });
        setTimeout(() => this.lockStatus = 'idle', 3000);
      },
      error: () => {
        this.lockStatus = 'error';
        this.snackBar.open('Failed to lock doors', 'OK', { duration: 3000 });
        setTimeout(() => this.lockStatus = 'idle', 3000);
      }
    });
  }

  unlockDoors(): void {
    if (!this.vehicleId || !this.userId) return;
    this.unlockStatus = 'loading';
    this.api.unlockDoors(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.unlockStatus = res.data.attributes.status === 'SUCCESS' ? 'success' : 'error';
        this.snackBar.open('Doors unlocked', 'OK', { duration: 3000 });
        setTimeout(() => this.unlockStatus = 'idle', 3000);
      },
      error: () => {
        this.unlockStatus = 'error';
        this.snackBar.open('Failed to unlock doors', 'OK', { duration: 3000 });
        setTimeout(() => this.unlockStatus = 'idle', 3000);
      }
    });
  }

  startCharging(): void {
    if (!this.vehicleId || !this.userId) return;
    this.chargeStartStatus = 'loading';
    this.api.startCharging(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.chargeStartStatus = res.data.attributes.status === 'SUCCESS' ? 'success' : 'error';
        this.snackBar.open('Charging started', 'OK', { duration: 3000 });
        setTimeout(() => this.chargeStartStatus = 'idle', 3000);
      },
      error: () => {
        this.chargeStartStatus = 'error';
        this.snackBar.open('Failed to start charging', 'OK', { duration: 3000 });
        setTimeout(() => this.chargeStartStatus = 'idle', 3000);
      }
    });
  }

  stopCharging(): void {
    if (!this.vehicleId || !this.userId) return;
    this.chargeStopStatus = 'loading';
    this.api.stopCharging(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.chargeStopStatus = res.data.attributes.status === 'SUCCESS' ? 'success' : 'error';
        this.snackBar.open('Charging stopped', 'OK', { duration: 3000 });
        setTimeout(() => this.chargeStopStatus = 'idle', 3000);
      },
      error: () => {
        this.chargeStopStatus = 'error';
        this.snackBar.open('Failed to stop charging', 'OK', { duration: 3000 });
        setTimeout(() => this.chargeStopStatus = 'idle', 3000);
      }
    });
  }

  refresh(): void {
    this.loadData();
  }
}
