import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-battery-charging-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule, MatTooltipModule, StatusBadgeComponent, CommandButtonComponent],
  templateUrl: './battery-charging-widget.component.html',
  styleUrl: './battery-charging-widget.component.scss'
})
export class BatteryChargingWidgetComponent {
  @Input() batteryLevel = 0;
  @Input() range = 'N/A';
  @Input() isCharging = false;
  @Input() cableConnected = false;
  @Input() chargeWattage = 'N/A';
  @Input() chargeTimeRemaining = 'N/A';
  @Input() chargingStatus = 'Unknown';
  @Input() chargingType = 'N/A';
  @Input() chargingDuration = 'N/A';
  @Input() chargeStartStatus: CmdStatus = 'idle';
  @Input() chargeStopStatus: CmdStatus = 'idle';
  @Input() logChargeStartStatus: CmdStatus = 'idle';
  @Input() logChargeStopStatus: CmdStatus = 'idle';
  @Input() hasActiveChargingSession = false;

  @Output() startCharging = new EventEmitter<void>();
  @Output() stopCharging = new EventEmitter<void>();
  @Output() logChargeStart = new EventEmitter<void>();
  @Output() logChargeStop = new EventEmitter<void>();
}
