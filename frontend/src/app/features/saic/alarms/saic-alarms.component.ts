import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SaicApiService } from '../../../core/services/saic-api.service';
import { SaicMessage } from '../../../core/models/saic.models';

@Component({
  selector: 'app-saic-alarms',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './saic-alarms.component.html',
  styleUrl: './saic-alarms.component.scss'
})
export class SaicAlarmsComponent implements OnInit, OnDestroy {
  alarms: SaicMessage[] = [];
  loading = true;
  error: string | null = null;

  private subs: Subscription[] = [];

  constructor(
    private saicApi: SaicApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAlarms();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAlarms(): void {
    this.loading = true;
    this.error = null;
    this.subs.push(
      this.saicApi.getMessages('ALARM', 1, 50).subscribe({
        next: res => {
          this.alarms = res.data || [];
          this.loading = false;
        },
        error: err => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load alarms. Is your SAIC account connected?';
        }
      })
    );
  }

  formatJson(alarm: SaicMessage): string {
    return JSON.stringify(alarm, null, 2);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
}
