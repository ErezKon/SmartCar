import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-signal-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './signal-card.component.html',
  styleUrl: './signal-card.component.scss'
})
export class SignalCardComponent {
  @Input() code: string = '';
  @Input() value: any = null;
  @Input() dataAge: string | null = null;
  @Input() description: string = '';
  @Input() group: string = '';

  get formattedValue(): string {
    if (this.value === null || this.value === undefined) return 'N/A';
    if (typeof this.value === 'boolean') return this.value ? 'Yes' : 'No';
    if (typeof this.value === 'object') return JSON.stringify(this.value);
    return String(this.value);
  }

  get formattedAge(): string {
    if (!this.dataAge) return 'Unknown';
    const date = new Date(this.dataAge);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  }

  get groupIcon(): string {
    const icons: Record<string, string> = {
      'Charge': 'battery_charging_full',
      'Climate': 'thermostat',
      'Closure': 'lock',
      'ConnectivitySoftware': 'system_update',
      'ConnectivityStatus': 'wifi',
      'Diagnostics': 'build',
      'HVAC': 'ac_unit',
      'InternalCombustionEngine': 'local_gas_station',
      'Location': 'location_on',
      'LowVoltageBattery': 'battery_std',
      'Motion': 'speed',
      'Odometer': 'straighten',
      'Service': 'miscellaneous_services',
      'Surveillance': 'videocam',
      'TractionBattery': 'battery_full',
      'Transmission': 'settings',
      'VehicleIdentification': 'directions_car',
      'VehicleUserAccount': 'person',
      'Wheel': 'tire_repair'
    };
    return icons[this.group] || 'info';
  }
}
