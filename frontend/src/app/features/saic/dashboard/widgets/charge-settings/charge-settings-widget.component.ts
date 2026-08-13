import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-charge-settings-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule, MatDividerModule, CommandButtonComponent],
  templateUrl: './charge-settings-widget.component.html',
  styleUrl: './charge-settings-widget.component.scss'
})
export class ChargeSettingsWidgetComponent {
  @Input() chargeLimit = 80;
  @Input() chargeCurrent = 'Max';
  @Input() chargeCurrentStatus: CmdStatus = 'idle';
  @Input() cableLockStatus: CmdStatus = 'idle';
  @Input() currentChargeLimits: unknown = 'N/A';

  @Output() chargeLimitChange = new EventEmitter<number>();
  @Output() chargeCurrentChange = new EventEmitter<string>();
  @Output() applyChargeLimit = new EventEmitter<void>();
  @Output() applyChargeCurrent = new EventEmitter<void>();
  @Output() setCableLock = new EventEmitter<boolean>();

  onChargeLimitChange(val: number): void {
    this.chargeLimit = val;
    this.chargeLimitChange.emit(val);
  }

  onChargeCurrentChange(val: string): void {
    this.chargeCurrent = val;
    this.chargeCurrentChange.emit(val);
  }
}
