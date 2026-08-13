import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SaicApiService } from '../../../core/services/saic-api.service';
import { SaicVinInfo, SaicChargingSession, SaicChargingStats } from '../../../core/models/saic.models';

@Component({
  selector: 'app-saic-statistics',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTableModule, MatTooltipModule, MatSelectModule,
    MatFormFieldModule, MatDividerModule,
  ],
  templateUrl: './saic-statistics.component.html',
  styleUrl: './saic-statistics.component.scss'
})
export class SaicStatisticsComponent implements OnInit, OnDestroy {
  vehicles: SaicVinInfo[] = [];
  selectedVin: string | null = null;
  loading = true;
  error: string | null = null;

  sessions: SaicChargingSession[] = [];
  stats: SaicChargingStats | null = null;
  sessionsLoading = false;

  sessionColumns = ['date', 'soc', 'energy_added', 'distance', 'efficiency', 'actions'];

  private subs: Subscription[] = [];

  constructor(
    private saicApi: SaicApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadVehicles(): void {
    this.loading = true;
    this.subs.push(
      this.saicApi.listVehicles().subscribe({
        next: res => {
          this.vehicles = res.data || [];
          if (this.vehicles.length > 0 && !this.selectedVin) {
            this.selectedVin = this.vehicles[0].vin;
            this.loadData();
          } else {
            this.loading = false;
          }
        },
        error: err => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load vehicles. Is your SAIC account connected?';
        }
      })
    );
  }

  onVehicleChange(): void {
    if (this.selectedVin) {
      this.loadData();
    }
  }

  loadData(): void {
    if (!this.selectedVin) return;
    this.sessionsLoading = true;
    this.loading = false;
    this.error = null;

    this.subs.push(
      this.saicApi.getChargingSessions(this.selectedVin).subscribe({
        next: res => {
          this.sessions = res.data || [];
          this.sessionsLoading = false;
        },
        error: err => {
          this.sessions = [];
          this.sessionsLoading = false;
          this.error = err.error?.message || 'Failed to load charging sessions';
        }
      })
    );

    this.subs.push(
      this.saicApi.getChargingStats(this.selectedVin).subscribe({
        next: res => { this.stats = res.data; },
        error: () => { this.stats = null; }
      })
    );
  }

  deleteSession(session: SaicChargingSession): void {
    if (!this.selectedVin) return;
    this.subs.push(
      this.saicApi.deleteChargingSession(this.selectedVin, session.id).subscribe({
        next: () => {
          this.sessions = this.sessions.filter(s => s.id !== session.id);
          this.snackBar.open('Session deleted', 'OK', { duration: 3000 });
          this.loadData();
        },
        error: err => {
          this.snackBar.open(err.error?.message || 'Failed to delete session', 'OK', { duration: 4000 });
        }
      })
    );
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  formatNum(val: number | null, decimals = 1): string {
    if (val == null) return '-';
    return val.toFixed(decimals);
  }

  get completedSessions(): SaicChargingSession[] {
    return this.sessions.filter(s => s.status === 'completed');
  }

  get sessionsWithEfficiency(): SaicChargingSession[] {
    return this.completedSessions.filter(s => s.efficiency_kwh_per_100km != null);
  }

  get efficiencyTrend(): { date: string; efficiency: number }[] {
    return this.sessionsWithEfficiency
      .map(s => ({ date: s.start_time, efficiency: s.efficiency_kwh_per_100km! }))
      .reverse();
  }
}
