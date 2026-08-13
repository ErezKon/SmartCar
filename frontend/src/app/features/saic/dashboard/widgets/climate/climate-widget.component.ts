import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-climate-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatSelectModule, MatFormFieldModule, StatusBadgeComponent, CommandButtonComponent],
  templateUrl: './climate-widget.component.html',
  styleUrl: './climate-widget.component.scss'
})
export class ClimateWidgetComponent {
  @Input() isClimateOn = false;
  @Input() externalTemp = 'N/A';
  @Input() internalTemp = 'N/A';
  @Input() climateMode: 'ac' | 'front' | 'blowing' = 'ac';
  @Input() climateTemp = 22;
  @Input() climateFanSpeed = 2;
  @Input() climateStartStatus: CmdStatus = 'idle';
  @Input() climateStopStatus: CmdStatus = 'idle';

  @Output() climateModeChange = new EventEmitter<'ac' | 'front' | 'blowing'>();
  @Output() climateTempChange = new EventEmitter<number>();
  @Output() climateFanSpeedChange = new EventEmitter<number>();
  @Output() startClimate = new EventEmitter<void>();
  @Output() stopClimate = new EventEmitter<void>();

  onModeChange(val: 'ac' | 'front' | 'blowing'): void {
    this.climateMode = val;
    this.climateModeChange.emit(val);
  }

  onTempChange(val: number): void {
    this.climateTemp = val;
    this.climateTempChange.emit(val);
  }

  onFanSpeedChange(val: number): void {
    this.climateFanSpeed = val;
    this.climateFanSpeedChange.emit(val);
  }

  temps = [17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33];
}
