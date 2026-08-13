import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { SmartcarApiService } from '../../../core/services/smartcar-api.service';
import { Webhook, Subscription as Sub, WebhookEvent } from '../../../core/models';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatTableModule, MatTabsModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, MatExpansionModule, MatDividerModule,
    MatProgressSpinnerModule, MatListModule, StatusBadgeComponent
  ],
  templateUrl: './webhooks.component.html',
  styleUrl: './webhooks.component.scss'
})
export class WebhooksComponent implements OnInit {
  webhooks: Webhook[] = [];
  subscriptions: Sub[] = [];
  events: WebhookEvent[] = [];
  loading = { webhooks: false, subscriptions: false, events: false };

  // Create subscription form
  newWebhookId: string = '';
  newUserId: string = '';
  newVehicleId: string = '';
  creating: boolean = false;

  eventsDisplayedColumns = ['event_type', 'vehicle_id', 'received_at', 'actions'];
  subsDisplayedColumns = ['id', 'webhookId', 'userId', 'vehicleId', 'actions'];

  selectedEvent: WebhookEvent | null = null;

  constructor(private api: SmartcarApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadWebhooks();
    this.loadSubscriptions();
    this.loadEvents();
  }

  loadWebhooks(): void {
    this.loading.webhooks = true;
    this.api.listWebhooks().subscribe({
      next: res => { this.webhooks = res.data || []; this.loading.webhooks = false; },
      error: () => { this.loading.webhooks = false; }
    });
  }

  loadSubscriptions(): void {
    this.loading.subscriptions = true;
    this.api.listSubscriptions().subscribe({
      next: res => { this.subscriptions = res.data || []; this.loading.subscriptions = false; },
      error: () => { this.loading.subscriptions = false; }
    });
  }

  loadEvents(): void {
    this.loading.events = true;
    this.api.listWebhookEvents(50).subscribe({
      next: res => { this.events = res.data || []; this.loading.events = false; },
      error: () => { this.loading.events = false; }
    });
  }

  createSubscription(): void {
    if (!this.newWebhookId || !this.newUserId || !this.newVehicleId) {
      this.snackBar.open('All fields are required', 'OK', { duration: 3000 });
      return;
    }
    this.creating = true;
    this.api.createSubscription(this.newWebhookId, this.newUserId, this.newVehicleId).subscribe({
      next: () => {
        this.creating = false;
        this.snackBar.open('Subscription created', 'OK', { duration: 3000 });
        this.newWebhookId = '';
        this.newUserId = '';
        this.newVehicleId = '';
        this.loadSubscriptions();
      },
      error: (err: any) => {
        this.creating = false;
        this.snackBar.open(err.message || 'Failed to create subscription', 'OK', { duration: 3000 });
      }
    });
  }

  removeSubscription(id: string): void {
    this.api.removeSubscription(id).subscribe({
      next: () => {
        this.snackBar.open('Subscription removed', 'OK', { duration: 3000 });
        this.loadSubscriptions();
      },
      error: (err: any) => {
        this.snackBar.open(err.message || 'Failed to remove subscription', 'OK', { duration: 3000 });
      }
    });
  }

  viewEventPayload(event: WebhookEvent): void {
    this.selectedEvent = this.selectedEvent?.id === event.id ? null : event;
  }

  parsePayload(payload: string): string {
    try { return JSON.stringify(JSON.parse(payload), null, 2); }
    catch { return payload; }
  }

  refreshAll(): void {
    this.loadWebhooks();
    this.loadSubscriptions();
    this.loadEvents();
  }
}
