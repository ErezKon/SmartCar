import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { SaicApiService } from '../../core/services/saic-api.service';
import { SaicAccountStatus } from '../../core/models/saic.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-saic-connect',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatButtonModule, MatDividerModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule,
    StatusBadgeComponent
  ],
  templateUrl: './saic-connect.component.html',
  styleUrl: './saic-connect.component.scss'
})
export class SaicConnectComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  region = 'il';
  connecting = false;
  disconnecting = false;
  showReconnectForm = false;
  loadingStatus = true;
  accountStatus: SaicAccountStatus | null = null;
  error: string | null = null;
  private subs: Subscription[] = [];

  regions = [
    { value: 'il', label: 'Israel' },
    { value: 'eu', label: 'Europe (EU)' },
    { value: 'au', label: 'Australia' },
    { value: 'tr', label: 'Turkey' },
    { value: 'br', label: 'Brazil' },
    { value: 'in', label: 'India' },
    { value: 'th', label: 'Thailand' },
    { value: 'cn', label: 'China' },
  ];

  constructor(
    private saicApi: SaicApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAccountStatus();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadAccountStatus(): void {
    this.loadingStatus = true;
    this.subs.push(
      this.saicApi.getAccountStatus().subscribe({
        next: status => {
          this.accountStatus = status;
          this.loadingStatus = false;
        },
        error: () => {
          this.accountStatus = { connected: false };
          this.loadingStatus = false;
        }
      })
    );
  }

  connect(): void {
    if (!this.username || !this.password) {
      this.error = 'Username and password are required.';
      return;
    }
    this.connecting = true;
    this.error = null;

    this.subs.push(
      this.saicApi.connectAccount(this.username, this.password, this.region).subscribe({
        next: res => {
          this.connecting = false;
          this.password = '';
          this.showReconnectForm = false;
          this.snackBar.open(`Connected as ${res.username} in ${res.region}`, 'OK', { duration: 4000 });
          this.loadAccountStatus();
        },
        error: err => {
          this.connecting = false;
          this.error = err.error?.message || err.message || 'Failed to connect. Check your credentials.';
        }
      })
    );
  }

  disconnect(): void {
    this.disconnecting = true;
    this.subs.push(
      this.saicApi.disconnectAccount().subscribe({
        next: () => {
          this.disconnecting = false;
          this.snackBar.open('SAIC account disconnected', 'OK', { duration: 3000 });
          this.loadAccountStatus();
        },
        error: err => {
          this.disconnecting = false;
          this.snackBar.open(err.message || 'Failed to disconnect', 'OK', { duration: 3000 });
        }
      })
    );
  }
}
