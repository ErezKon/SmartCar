import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-battery-heating-widget',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatIconModule, MatInputModule, MatSelectModule, MatFormFieldModule, CommandButtonComponent],
  templateUrl: './battery-heating-widget.component.html',
  styleUrl: './battery-heating-widget.component.scss'
})
export class BatteryHeatingWidgetComponent {
  @Input() batteryHeatingStart = '06:00';
  @Input() batteryHeatingMode: 'on' | 'off' = 'on';
  @Input() batteryHeatingScheduleStatus: CmdStatus = 'idle';

  @Output() batteryHeatingStartChange = new EventEmitter<string>();
  @Output() batteryHeatingModeChange = new EventEmitter<'on' | 'off'>();
  @Output() applyBatteryHeatingSchedule = new EventEmitter<void>();

  onStartChange(val: string): void {
    this.batteryHeatingStart = val;
    this.batteryHeatingStartChange.emit(val);
  }

  onModeChange(val: 'on' | 'off'): void {
    this.batteryHeatingMode = val;
    this.batteryHeatingModeChange.emit(val);
  }
}
