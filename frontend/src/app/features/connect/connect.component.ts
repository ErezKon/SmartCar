import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SmartcarApiService } from '../../core/services/smartcar-api.service';
import { AuthService } from '../../core/services/auth.service';
import { Connection, ConnectedUser } from '../../core/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatListModule, MatSnackBarModule,
    MatDividerModule, MatCheckboxModule, StatusBadgeComponent
  ],
  templateUrl: './connect.component.html',
  styleUrl: './connect.component.scss'
})
export class ConnectComponent implements OnInit {
  mode: string = 'simulated';
  make: string = '';
  singleSelect: boolean = false;
  users: ConnectedUser[] = [];
  connections: Connection[] = [];
  hasToken: boolean = false;
  loading: boolean = false;
  callbackStatus: string | null = null;
  callbackMessage: string | null = null;

  constructor(
    private api: SmartcarApiService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.callbackStatus = params['status'];
        this.callbackMessage = params['message'] || (params['status'] === 'success' ? 'Vehicle connected successfully!' : 'Connection failed');
        if (params['status'] === 'success') {
          this.snackBar.open('Vehicle connected!', 'OK', { duration: 5000 });
          this.refreshData();
        }
      }
    });
    this.refreshData();
  }

  refreshData(): void {
    this.loading = true;
    this.auth.refreshStatus().subscribe({
      next: status => {
        this.hasToken = status.token.hasToken;
        this.users = status.users || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });

    this.api.listConnections().subscribe({
      next: res => { this.connections = res.data || []; },
      error: () => {}
    });
  }

  connectVehicle(): void {
    const params = new URLSearchParams();
    params.set('mode', this.mode);
    if (this.make) params.set('make', this.make);
    if (this.singleSelect) params.set('single_select', 'true');
    window.location.href = `/auth/connect?${params.toString()}`;
  }

  getVehicleLabel(conn: Connection): string {
    const v = conn.attributes.vehicle;
    return v ? `${v.year} ${v.make} ${v.model}` : conn.attributes.vehicleId;
  }

  selectVehicle(conn: Connection): void {
    this.auth.setActiveVehicle(conn.attributes.vehicleId);
    this.auth.setActiveUser(conn.attributes.userId);
    this.snackBar.open(`Selected: ${this.getVehicleLabel(conn)}`, 'OK', { duration: 3000 });
  }
}
