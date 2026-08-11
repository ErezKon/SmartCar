import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-command-button',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './command-button.component.html',
  styleUrl: './command-button.component.scss'
})
export class CommandButtonComponent {
  @Input() label: string = '';
  @Input() icon: string = '';
  @Input() color: 'primary' | 'accent' | 'warn' = 'primary';
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() status: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @Output() execute = new EventEmitter<void>();

  onClick(): void {
    if (!this.loading && !this.disabled) {
      this.execute.emit();
    }
  }

  get statusIcon(): string {
    switch (this.status) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return this.icon;
    }
  }

  get statusColor(): string {
    switch (this.status) {
      case 'success': return 'green';
      case 'error': return 'red';
      default: return '';
    }
  }
}
