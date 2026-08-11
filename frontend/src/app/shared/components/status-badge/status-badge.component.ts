import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input() status: string = '';
  @Input() size: 'small' | 'medium' = 'medium';

  get statusClass(): string {
    const s = this.status.toLowerCase();
    if (['success', 'connected', 'active', 'online', 'locked', 'charging'].includes(s)) return 'success';
    if (['error', 'failure', 'failed', 'disconnected', 'offline'].includes(s)) return 'error';
    if (['pending', 'loading', 'in_progress'].includes(s)) return 'warning';
    return 'default';
  }
}
