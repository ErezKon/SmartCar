import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CmdStatus, SaicVinInfo } from '../../../../../core/models/saic.models';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-vehicle-info-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, CommandButtonComponent],
  templateUrl: './vehicle-info-widget.component.html',
  styleUrl: './vehicle-info-widget.component.scss'
})
export class VehicleInfoWidgetComponent {
  @Input() vehicle: SaicVinInfo | undefined;
  @Input() vin: string | null = null;
  @Input() odometer = 'N/A';
  @Input() journeyDistance = 'N/A';
  @Input() isEngineRunning = false;
  @Input() isHandBrakeEngaged = false;
  @Input() findStatus: CmdStatus = 'idle';

  @Output() findVehicle = new EventEmitter<void>();
}
