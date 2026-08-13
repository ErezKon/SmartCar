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
  selector: 'app-charging-schedule-widget',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatIconModule, MatInputModule, MatSelectModule, MatFormFieldModule, CommandButtonComponent],
  templateUrl: './charging-schedule-widget.component.html',
  styleUrl: './charging-schedule-widget.component.scss'
})
export class ChargingScheduleWidgetComponent {
  @Input() chargingScheduleStart = '22:00';
  @Input() chargingScheduleEnd = '06:00';
  @Input() chargingScheduleMode: 'disabled' | 'until_target_soc' | 'until_scheduled_time' = 'until_target_soc';
  @Input() chargingScheduleStatus: CmdStatus = 'idle';

  @Output() chargingScheduleStartChange = new EventEmitter<string>();
  @Output() chargingScheduleEndChange = new EventEmitter<string>();
  @Output() chargingScheduleModeChange = new EventEmitter<'disabled' | 'until_target_soc' | 'until_scheduled_time'>();
  @Output() applyChargingSchedule = new EventEmitter<void>();

  onStartChange(val: string): void {
    this.chargingScheduleStart = val;
    this.chargingScheduleStartChange.emit(val);
  }

  onEndChange(val: string): void {
    this.chargingScheduleEnd = val;
    this.chargingScheduleEndChange.emit(val);
  }

  onModeChange(val: 'disabled' | 'until_target_soc' | 'until_scheduled_time'): void {
    this.chargingScheduleMode = val;
    this.chargingScheduleModeChange.emit(val);
  }
}
