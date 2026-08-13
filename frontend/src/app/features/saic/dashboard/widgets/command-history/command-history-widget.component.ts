import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { SaicCommandLogEntry } from '../../../../../core/models/saic.models';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-command-history-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, StatusBadgeComponent],
  templateUrl: './command-history-widget.component.html',
  styleUrl: './command-history-widget.component.scss'
})
export class CommandHistoryWidgetComponent {
  @Input() commandLogs: SaicCommandLogEntry[] = [];
  @Input() logColumns = ['command', 'status', 'duration_ms', 'created_at'];

  @Output() loadCommandLogs = new EventEmitter<void>();
}
