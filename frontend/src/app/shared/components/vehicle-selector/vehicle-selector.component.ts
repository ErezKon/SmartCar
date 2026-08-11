import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SmartcarApiService } from '../../../core/services/smartcar-api.service';
import { Connection } from '../../../core/models';

@Component({
  selector: 'app-vehicle-selector',
  standalone: true,
  imports: [CommonModule, MatSelectModule, MatFormFieldModule, MatIconModule, FormsModule],
  templateUrl: './vehicle-selector.component.html',
  styleUrl: './vehicle-selector.component.scss'
})
export class VehicleSelectorComponent implements OnInit, OnDestroy {
  connections: Connection[] = [];
  selectedVehicleId: string | null = null;
  selectedUserId: string | null = null;
  loading = false;
  private subs: Subscription[] = [];

  constructor(private auth: AuthService, private api: SmartcarApiService) {}

  ngOnInit(): void {
    this.selectedVehicleId = this.auth.currentVehicleId;
    this.selectedUserId = this.auth.currentUserId;
    this.loadConnections();

    this.subs.push(
      this.auth.userId$.subscribe(id => {
        this.selectedUserId = id;
        if (id) this.loadConnections();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadConnections(): void {
    this.loading = true;
    const filters = this.selectedUserId ? { userId: this.selectedUserId } : undefined;
    this.api.listConnections(filters).subscribe({
      next: res => {
        this.connections = res.data || [];
        this.loading = false;
        if (this.connections.length > 0 && !this.selectedVehicleId) {
          this.onVehicleChange(this.connections[0].attributes.vehicleId);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  onVehicleChange(vehicleId: string): void {
    this.selectedVehicleId = vehicleId;
    this.auth.setActiveVehicle(vehicleId);
    const conn = this.connections.find(c => c.attributes.vehicleId === vehicleId);
    if (conn) {
      this.auth.setActiveUser(conn.attributes.userId);
    }
  }

  getVehicleLabel(conn: Connection): string {
    const v = conn.attributes.vehicle;
    return v ? `${v.year} ${v.make} ${v.model}` : conn.attributes.vehicleId;
  }
}
