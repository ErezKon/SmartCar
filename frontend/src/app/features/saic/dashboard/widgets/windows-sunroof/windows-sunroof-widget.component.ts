import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-windows-sunroof-widget',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatDividerModule, CommandButtonComponent],
  templateUrl: './windows-sunroof-widget.component.html',
  styleUrl: './windows-sunroof-widget.component.scss'
})
export class WindowsSunroofWidgetComponent {
  @Input() windowAction: 'close' | 'ventilate' | 'open' = 'close';
  @Input() sunroofAction: 'close' | 'open' = 'close';
  @Input() windowsStatus: CmdStatus = 'idle';
  @Input() sunroofStatus: CmdStatus = 'idle';

  @Output() windowActionChange = new EventEmitter<'close' | 'ventilate' | 'open'>();
  @Output() sunroofActionChange = new EventEmitter<'close' | 'open'>();
  @Output() controlWindows = new EventEmitter<void>();
  @Output() controlSunroof = new EventEmitter<void>();

  onWindowActionChange(val: 'close' | 'ventilate' | 'open'): void {
    this.windowAction = val;
    this.windowActionChange.emit(val);
  }

  onSunroofActionChange(val: 'close' | 'open'): void {
    this.sunroofAction = val;
    this.sunroofActionChange.emit(val);
  }
}
