import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subscription } from 'rxjs';
import { SmartcarApiService } from '../../../core/services/smartcar-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommandLogEntry, CommandResponse } from '../../../core/models';
import { CommandButtonComponent } from '../../../shared/components/command-button/command-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-commands',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatSliderModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTabsModule, MatTableModule, MatSnackBarModule, MatDividerModule,
    MatCheckboxModule, CommandButtonComponent, StatusBadgeComponent
  ],
  templateUrl: './commands.component.html',
  styleUrl: './commands.component.scss'
})
export class CommandsComponent implements OnInit, OnDestroy {
  vehicleId: string | null = null;
  userId: string | null = null;

  // Charge limit
  chargeLimit: number = 80;

  // Navigation
  latitude: number = 0;
  longitude: number = 0;

  // Schedules
  dailyStartTime: string = '22:00';
  dailyEndTime: string = '06:00';
  dailyTargetSoc: number = 80;

  weeklyDay: string = 'monday';
  weeklyStartTime: string = '22:00';
  weeklyEndTime: string = '06:00';

  workweekWeekdayStart: string = '22:00';
  workweekWeekdayEnd: string = '06:00';
  workweekWeekendStart: string = '23:00';
  workweekWeekendEnd: string = '07:00';

  deleteScheduleId: string = '';

  // Command statuses
  statuses: Record<string, 'idle' | 'loading' | 'success' | 'error'> = {};

  // Command history
  commandLogs: CommandLogEntry[] = [];
  displayedColumns = ['command_type', 'status', 'duration_ms', 'created_at'];

  private subs: Subscription[] = [];

  constructor(
    private api: SmartcarApiService,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.auth.vehicleId$.subscribe(id => {
        this.vehicleId = id;
        if (id) this.loadCommandLogs();
      }),
      this.auth.userId$.subscribe(id => this.userId = id)
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private executeCommand(key: string, obs: ReturnType<typeof this.api.startCharging>, successMsg: string): void {
    this.statuses[key] = 'loading';
    obs.subscribe({
      next: (res: CommandResponse) => {
        this.statuses[key] = res.data.attributes.status === 'SUCCESS' ? 'success' : 'error';
        this.snackBar.open(successMsg, 'OK', { duration: 3000 });
        this.loadCommandLogs();
        setTimeout(() => this.statuses[key] = 'idle', 3000);
      },
      error: (err: any) => {
        this.statuses[key] = 'error';
        this.snackBar.open(err.message || 'Command failed', 'OK', { duration: 3000 });
        setTimeout(() => this.statuses[key] = 'idle', 3000);
      }
    });
  }

  get noVehicle(): boolean { return !this.vehicleId || !this.userId; }

  startCharging(): void {
    if (this.noVehicle) return;
    this.executeCommand('chargeStart', this.api.startCharging(this.vehicleId!, this.userId!), 'Charging started');
  }

  stopCharging(): void {
    if (this.noVehicle) return;
    this.executeCommand('chargeStop', this.api.stopCharging(this.vehicleId!, this.userId!), 'Charging stopped');
  }

  setChargeLimit(): void {
    if (this.noVehicle) return;
    this.executeCommand('chargeLimit', this.api.setChargeLimit(this.vehicleId!, this.userId!, this.chargeLimit), `Charge limit set to ${this.chargeLimit}%`);
  }

  lockDoors(): void {
    if (this.noVehicle) return;
    this.executeCommand('lock', this.api.lockDoors(this.vehicleId!, this.userId!), 'Doors locked');
  }

  unlockDoors(): void {
    if (this.noVehicle) return;
    this.executeCommand('unlock', this.api.unlockDoors(this.vehicleId!, this.userId!), 'Doors unlocked');
  }

  setDestination(): void {
    if (this.noVehicle) return;
    if (this.latitude < -90 || this.latitude > 90 || this.longitude < -180 || this.longitude > 180) {
      this.snackBar.open('Invalid coordinates', 'OK', { duration: 3000 });
      return;
    }
    this.executeCommand('nav', this.api.setDestination(this.vehicleId!, this.userId!, this.latitude, this.longitude), 'Destination set');
  }

  setDailySchedule(): void {
    if (this.noVehicle) return;
    this.executeCommand('dailySchedule', this.api.setDailySchedule(this.vehicleId!, this.userId!, {
      startTime: this.dailyStartTime, endTime: this.dailyEndTime, targetSoc: this.dailyTargetSoc
    }), 'Daily schedule set');
  }

  setWeeklySchedule(): void {
    if (this.noVehicle) return;
    this.executeCommand('weeklySchedule', this.api.setWeeklySchedule(this.vehicleId!, this.userId!, {
      schedules: [{ day: this.weeklyDay as any, startTime: this.weeklyStartTime, endTime: this.weeklyEndTime }]
    }), 'Weekly schedule set');
  }

  setWorkweekSchedule(): void {
    if (this.noVehicle) return;
    this.executeCommand('workweekSchedule', this.api.setWorkweekSchedule(this.vehicleId!, this.userId!, {
      weekdayStartTime: this.workweekWeekdayStart, weekdayEndTime: this.workweekWeekdayEnd,
      weekendStartTime: this.workweekWeekendStart, weekendEndTime: this.workweekWeekendEnd
    }), 'Workweek schedule set');
  }

  deleteSchedule(): void {
    if (this.noVehicle || !this.deleteScheduleId) return;
    this.statuses['deleteSchedule'] = 'loading';
    this.api.deleteChargeSchedule(this.vehicleId!, this.userId!, this.deleteScheduleId).subscribe({
      next: () => {
        this.statuses['deleteSchedule'] = 'success';
        this.snackBar.open('Schedule deleted', 'OK', { duration: 3000 });
        this.deleteScheduleId = '';
        setTimeout(() => this.statuses['deleteSchedule'] = 'idle', 3000);
      },
      error: (err: any) => {
        this.statuses['deleteSchedule'] = 'error';
        this.snackBar.open(err.message || 'Failed to delete schedule', 'OK', { duration: 3000 });
        setTimeout(() => this.statuses['deleteSchedule'] = 'idle', 3000);
      }
    });
  }

  loadCommandLogs(): void {
    if (!this.vehicleId) return;
    this.api.getCommandLogs(this.vehicleId).subscribe({
      next: res => { this.commandLogs = res.data || []; },
      error: () => {}
    });
  }

  getStatus(key: string): 'idle' | 'loading' | 'success' | 'error' {
    return this.statuses[key] || 'idle';
  }
}
