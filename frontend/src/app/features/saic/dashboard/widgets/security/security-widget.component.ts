import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { CmdStatus } from '../../../../../core/models/saic.models';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { CommandButtonComponent } from '../../../../../shared/components/command-button/command-button.component';

@Component({
  selector: 'app-security-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, StatusBadgeComponent, CommandButtonComponent],
  templateUrl: './security-widget.component.html',
  styleUrl: './security-widget.component.scss'
})
export class SecurityWidgetComponent {
  @Input() isLocked = false;
  @Input() lockStatus: CmdStatus = 'idle';
  @Input() unlockStatus: CmdStatus = 'idle';

  @Output() lockDoors = new EventEmitter<void>();
  @Output() unlockDoors = new EventEmitter<void>();
}
