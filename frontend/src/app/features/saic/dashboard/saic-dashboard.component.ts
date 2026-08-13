import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SaicApiService } from '../../../core/services/saic-api.service';
import { SaicVinInfo, SaicNormalizedSignal, SaicCommandLogEntry, CmdStatus } from '../../../core/models/saic.models';
import { VehicleInfoWidgetComponent } from './widgets/vehicle-info/vehicle-info-widget.component';
import { BatteryChargingWidgetComponent } from './widgets/battery-charging/battery-charging-widget.component';
import { SecurityWidgetComponent } from './widgets/security/security-widget.component';
import { WindowsSunroofWidgetComponent } from './widgets/windows-sunroof/windows-sunroof-widget.component';
import { ClimateWidgetComponent } from './widgets/climate/climate-widget.component';
import { ClimateExtrasWidgetComponent } from './widgets/climate-extras/climate-extras-widget.component';
import { LocationWidgetComponent } from './widgets/location/location-widget.component';
import { TyrePressureWidgetComponent } from './widgets/tyre-pressure/tyre-pressure-widget.component';
import { DrivingStatsWidgetComponent } from './widgets/driving-stats/driving-stats-widget.component';
import { ChargeSettingsWidgetComponent } from './widgets/charge-settings/charge-settings-widget.component';
import { ChargingScheduleWidgetComponent } from './widgets/charging-schedule/charging-schedule-widget.component';
import { BatteryHeatingWidgetComponent } from './widgets/battery-heating/battery-heating-widget.component';
import { CommandHistoryWidgetComponent } from './widgets/command-history/command-history-widget.component';

@Component({
  selector: 'app-saic-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatSelectModule, MatFormFieldModule,
    MatChipsModule, MatTooltipModule,
    VehicleInfoWidgetComponent, BatteryChargingWidgetComponent,
    SecurityWidgetComponent, WindowsSunroofWidgetComponent,
    ClimateWidgetComponent, ClimateExtrasWidgetComponent,
    LocationWidgetComponent, TyrePressureWidgetComponent,
    DrivingStatsWidgetComponent, ChargeSettingsWidgetComponent,
    ChargingScheduleWidgetComponent, BatteryHeatingWidgetComponent,
    CommandHistoryWidgetComponent
  ],
  templateUrl: './saic-dashboard.component.html',
  styleUrl: './saic-dashboard.component.scss'
})
export class SaicDashboardComponent implements OnInit, OnDestroy {
  vehicles: SaicVinInfo[] = [];
  selectedVin: string | null = null;
  signals: Map<string, unknown> = new Map();
  loading = true;
  refreshing = false;
  error: string | null = null;
  commandLogs: SaicCommandLogEntry[] = [];

  // Polling mode
  pollingEnabled = false;
  pollingIntervalMs = 30000;
  private cacheRefreshTimer: ReturnType<typeof setInterval> | null = null;

  // Charging session tracking
  hasActiveChargingSession = false;
  logChargeStartStatus: CmdStatus = 'idle';
  logChargeStopStatus: CmdStatus = 'idle';

  // Command statuses
  lockStatus: CmdStatus = 'idle';
  unlockStatus: CmdStatus = 'idle';
  chargeStartStatus: CmdStatus = 'idle';
  chargeStopStatus: CmdStatus = 'idle';
  climateStartStatus: CmdStatus = 'idle';
  climateStopStatus: CmdStatus = 'idle';
  findStatus: CmdStatus = 'idle';
  windowsStatus: CmdStatus = 'idle';
  sunroofStatus: CmdStatus = 'idle';
  heatedSteeringStatus: CmdStatus = 'idle';
  frontDefrostStatus: CmdStatus = 'idle';
  rearWindowHeatStatus: CmdStatus = 'idle';
  seatsHeatStatus: CmdStatus = 'idle';
  cableLockStatus: CmdStatus = 'idle';
  chargeCurrentStatus: CmdStatus = 'idle';
  chargingScheduleStatus: CmdStatus = 'idle';
  batteryHeatingScheduleStatus: CmdStatus = 'idle';

  // Climate settings
  climateTemp = 17;
  climateFanSpeed = 3;
  climateMode: 'ac' | 'front' | 'blowing' = 'ac';

  // Charge limit
  chargeLimit = 80;

  // Windows & sunroof
  windowAction: 'close' | 'ventilate' | 'open' = 'close';
  sunroofAction: 'close' | 'open' = 'close';

  // Climate extras
  seatHeatDriverLevel = 0;
  seatHeatPassengerLevel = 0;

  // Charging extras
  chargeCurrent = 'Max';

  // Charging schedule
  chargingScheduleStart = '22:00';
  chargingScheduleEnd = '06:00';
  chargingScheduleMode: 'disabled' | 'until_target_soc' | 'until_scheduled_time' = 'until_target_soc';

  // Battery heating schedule
  batteryHeatingStart = '06:00';
  batteryHeatingMode: 'on' | 'off' = 'on';

  logColumns = ['command', 'status', 'duration_ms', 'created_at'];

  private subs: Subscription[] = [];

  constructor(
    private saicApi: SaicApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSettings();
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.stopCacheRefresh();
    this.subs.forEach(s => s.unsubscribe());
  }

  private loadSettings(): void {
    this.subs.push(
      this.saicApi.getSettings().subscribe({
        next: settings => {
          this.pollingEnabled = settings.pollingEnabled;
          this.pollingIntervalMs = settings.pollingIntervalMs;
          if (this.pollingEnabled) {
            this.startCacheRefresh();
          }
        },
        error: () => { /* settings endpoint unavailable — assume manual mode */ }
      })
    );
  }

  private startCacheRefresh(): void {
    this.stopCacheRefresh();
    // Re-read cached data from the backend at the polling interval
    this.cacheRefreshTimer = setInterval(() => {
      if (this.selectedVin && !this.refreshing) {
        this.loadSignals(false);
      }
    }, this.pollingIntervalMs);
  }

  private stopCacheRefresh(): void {
    if (this.cacheRefreshTimer) {
      clearInterval(this.cacheRefreshTimer);
      this.cacheRefreshTimer = null;
    }
  }

  loadVehicles(): void {
    this.loading = true;
    this.subs.push(
      this.saicApi.listVehicles().subscribe({
        next: res => {
          this.vehicles = res.data || [];
          if (this.vehicles.length > 0 && !this.selectedVin) {
            this.selectedVin = this.vehicles[0].vin;
            this.loadSignals();
          } else {
            this.loading = false;
          }
        },
        error: err => {
          this.loading = false;
          this.error = err.error?.message || 'Failed to load vehicles. Is your SAIC account connected?';
        }
      })
    );
  }

  onVehicleChange(): void {
    if (this.selectedVin) {
      this.loadSignals();
    }
  }

  loadSignals(refresh = false): void {
    if (!this.selectedVin) return;
    if (refresh) this.refreshing = true;
    else this.loading = true;

    this.error = null;

    this.subs.push(
      this.saicApi.getSignals(this.selectedVin, refresh).subscribe({
        next: res => {
          this.signals.clear();
          (res.data || []).forEach((s: SaicNormalizedSignal) => {
            this.signals.set(s.code, s.value);
          });
          this.loading = false;
          this.refreshing = false;
          this.checkActiveChargingSession();
        },
        error: err => {
          this.loading = false;
          this.refreshing = false;
          if (err.status === 504) {
            this.error = 'Vehicle is asleep. Cached data shown if available.';
          } else {
            this.error = err.error?.message || 'Failed to load vehicle data';
          }
        }
      })
    );
  }

  loadCommandLogs(): void {
    if (!this.selectedVin) return;
    this.subs.push(
      this.saicApi.getCommandLogs(this.selectedVin).subscribe({
        next: res => { this.commandLogs = res.data || []; },
        error: () => { this.commandLogs = []; }
      })
    );
  }

  checkActiveChargingSession(): void {
    if (!this.selectedVin) return;
    this.subs.push(
      this.saicApi.getChargingSessions(this.selectedVin, 1, 0).subscribe({
        next: res => { this.hasActiveChargingSession = res.hasActiveSession; },
        error: () => { this.hasActiveChargingSession = false; }
      })
    );
  }

  logChargeStart(): void {
    if (!this.selectedVin) return;
    this.logChargeStartStatus = 'loading';
    this.subs.push(
      this.saicApi.startChargingSession(this.selectedVin).subscribe({
        next: () => {
          this.logChargeStartStatus = 'success';
          this.hasActiveChargingSession = true;
          this.snackBar.open('Charging session logged (start)', 'OK', { duration: 3000 });
          setTimeout(() => { this.logChargeStartStatus = 'idle'; }, 3000);
        },
        error: err => {
          this.logChargeStartStatus = 'error';
          this.snackBar.open(err.error?.message || 'Failed to log charge start', 'OK', { duration: 4000 });
          setTimeout(() => { this.logChargeStartStatus = 'idle'; }, 3000);
        }
      })
    );
  }

  logChargeStop(): void {
    if (!this.selectedVin) return;
    this.logChargeStopStatus = 'loading';
    this.subs.push(
      this.saicApi.stopChargingSession(this.selectedVin).subscribe({
        next: () => {
          this.logChargeStopStatus = 'success';
          this.hasActiveChargingSession = false;
          this.snackBar.open('Charging session logged (stop)', 'OK', { duration: 3000 });
          setTimeout(() => { this.logChargeStopStatus = 'idle'; }, 3000);
        },
        error: err => {
          this.logChargeStopStatus = 'error';
          this.snackBar.open(err.error?.message || 'Failed to log charge stop', 'OK', { duration: 4000 });
          setTimeout(() => { this.logChargeStopStatus = 'idle'; }, 3000);
        }
      })
    );
  }

  refreshLive(): void {
    this.loadSignals(true);
  }

  // --- Signal accessors ---

  getSignal(code: string): unknown {
    return this.signals.get(code) ?? 'N/A';
  }

  get selectedVehicle(): SaicVinInfo | undefined {
    return this.vehicles.find(v => v.vin === this.selectedVin);
  }

  get batteryLevel(): number {
    const val = this.signals.get('tractionbattery-stateofcharge');
    return typeof val === 'number' ? val : 0;
  }

  get range(): string {
    const val = this.signals.get('tractionbattery-range');
    return val != null ? `${val} km` : 'N/A';
  }

  get isCharging(): boolean {
    return this.signals.get('charge-ischarging') === true;
  }

  get chargingStatus(): string {
    const val = this.signals.get('charge-detailedchargingstatus');
    return typeof val === 'string' ? val : 'Unknown';
  }

  get isLocked(): boolean {
    return this.signals.get('closure-islocked') === true;
  }

  get odometer(): string {
    const val = this.signals.get('odometer-traveleddistance');
    return val != null ? `${Number(val).toLocaleString()} km` : 'N/A';
  }

  get externalTemp(): string {
    const val = this.signals.get('climate-externaltemperature');
    return val != null ? `${val} C` : 'N/A';
  }

  get internalTemp(): string {
    const val = this.signals.get('climate-internaltemperature');
    return val != null ? `${val} C` : 'N/A';
  }

  get isClimateOn(): boolean {
    return this.signals.get('hvac-iscabinhvacactive') === true;
  }

  get location(): string {
    const val = this.signals.get('location-preciselocation');
    if (val && typeof val === 'object') {
      const loc = val as Record<string, number>;
      if (loc['latitude'] && loc['longitude']) {
        return `${loc['latitude'].toFixed(4)}, ${loc['longitude'].toFixed(4)}`;
      }
    }
    return 'N/A';
  }

  get chargeWattage(): string {
    const val = this.signals.get('charge-wattage');
    return val != null ? `${val} kW` : 'N/A';
  }

  get chargeTimeRemaining(): string {
    const val = this.signals.get('charge-timetocomplete');
    if (val == null) return 'N/A';
    const mins = Number(val);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  get cableConnected(): boolean {
    return this.signals.get('charge-ischargingcableconnected') === true;
  }

  get tyres(): { fl: string; fr: string; rl: string; rr: string } {
    const t = this.signals.get('diagnostics-tirepressure');
    if (t && typeof t === 'object') {
      const tp = t as Record<string, number>;
      return {
        fl: tp['frontLeft'] != null ? `${tp['frontLeft'].toFixed(1)} bar` : 'N/A',
        fr: tp['frontRight'] != null ? `${tp['frontRight'].toFixed(1)} bar` : 'N/A',
        rl: tp['rearLeft'] != null ? `${tp['rearLeft'].toFixed(1)} bar` : 'N/A',
        rr: tp['rearRight'] != null ? `${tp['rearRight'].toFixed(1)} bar` : 'N/A',
      };
    }
    return { fl: 'N/A', fr: 'N/A', rl: 'N/A', rr: 'N/A' };
  }

  get mileageToday(): string {
    const val = this.signals.get('saic-mileage-today');
    return val != null ? `${val} km` : 'N/A';
  }

  get energyToday(): string {
    const val = this.signals.get('saic-energy-today');
    return val != null ? `${val} kWh` : 'N/A';
  }

  get mileageSinceCharge(): string {
    const val = this.signals.get('saic-mileage-since-charge');
    return val != null ? `${val} km` : 'N/A';
  }

  get energySinceCharge(): string {
    const val = this.signals.get('saic-energy-since-charge');
    return val != null ? `${val} kWh` : 'N/A';
  }

  get journeyDistance(): string {
    const val = this.signals.get('saic-current-journey-distance');
    return val != null ? `${val} km` : 'N/A';
  }

  get chargingType(): string {
    const val = this.signals.get('saic-charging-type');
    return typeof val === 'string' ? val : 'N/A';
  }

  get chargingDuration(): string {
    const val = this.signals.get('saic-charging-duration');
    if (val == null) return 'N/A';
    const mins = Number(val);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  get isEngineRunning(): boolean {
    return this.signals.get('saic-engine-running') === true;
  }

  get isHandBrakeEngaged(): boolean {
    return this.signals.get('saic-hand-brake') === true;
  }

  get lightsStatus(): { mainBeam: boolean; dippedBeam: boolean; sideLight: boolean } | null {
    const val = this.signals.get('saic-lights');
    if (val && typeof val === 'object') {
      return val as { mainBeam: boolean; dippedBeam: boolean; sideLight: boolean };
    }
    return null;
  }

  // --- Commands ---

  private executeCmd(cmdName: string, statusProp: keyof this, body?: Record<string, unknown>, successMsg?: string): void {
    if (!this.selectedVin) return;
    (this as Record<string, unknown>)[statusProp as string] = 'loading';

    this.subs.push(
      this.saicApi.executeCommand(this.selectedVin, cmdName, body).subscribe({
        next: (res) => {
          if (res.data?.status === 'UNCONFIRMED' || (res as Record<string, unknown>)['warning']) {
            (this as Record<string, unknown>)[statusProp as string] = 'success';
            const warning = (res as Record<string, unknown>)['warning'] as string
              || 'Command sent but not confirmed — it may still have been applied.';
            this.snackBar.open(warning, 'OK', { duration: 5000, panelClass: 'snackbar-warning' });
          } else {
            (this as Record<string, unknown>)[statusProp as string] = 'success';
            this.snackBar.open(successMsg || `${cmdName} succeeded`, 'OK', { duration: 3000 });
          }
          setTimeout(() => { (this as Record<string, unknown>)[statusProp as string] = 'idle'; }, 3000);
        },
        error: err => {
          (this as Record<string, unknown>)[statusProp as string] = 'error';
          this.snackBar.open(err.error?.message || err.message || `${cmdName} failed`, 'OK', { duration: 4000 });
          setTimeout(() => { (this as Record<string, unknown>)[statusProp as string] = 'idle'; }, 3000);
        }
      })
    );
  }

  lockDoors(): void { this.executeCmd('lock', 'lockStatus', undefined, 'Doors locked'); }
  unlockDoors(): void { this.executeCmd('unlock', 'unlockStatus', { lockId: 3 }, 'Doors unlocked'); }
  startCharging(): void { this.executeCmd('startCharging', 'chargeStartStatus', undefined, 'Charging started'); }
  stopCharging(): void { this.executeCmd('stopCharging', 'chargeStopStatus', undefined, 'Charging stopped'); }

  startClimate(): void {
    if (this.climateMode === 'ac') {
      this.executeCmd('startClimate', 'climateStartStatus',
        { temperature: this.climateTemp, fanSpeed: this.climateFanSpeed },
        `Climate started at ${this.climateTemp}C`
      );
    } else {
      this.executeCmd('climateMode', 'climateStartStatus',
        { mode: this.climateMode, temperature: this.climateTemp, fanSpeed: this.climateFanSpeed },
        `Climate started (${this.climateMode} mode)`
      );
    }
  }

  stopClimate(): void { this.executeCmd('stopClimate', 'climateStopStatus', undefined, 'Climate stopped'); }
  findVehicle(): void { this.executeCmd('findVehicle', 'findStatus', undefined, 'Find vehicle activated (horn + lights)'); }

  applyChargeLimit(): void {
    if (!this.selectedVin) return;
    this.subs.push(
      this.saicApi.executeCommand(this.selectedVin, 'setChargeLimit', { percent: this.chargeLimit }).subscribe({
        next: () => this.snackBar.open(`Charge limit set to ${this.chargeLimit}%`, 'OK', { duration: 3000 }),
        error: err => this.snackBar.open(err.error?.message || 'Failed to set charge limit', 'OK', { duration: 4000 })
      })
    );
  }

  controlWindows(): void {
    this.executeCmd('controlWindows', 'windowsStatus', { action: this.windowAction }, `Windows: ${this.windowAction}`);
  }

  controlSunroof(): void {
    this.executeCmd('controlSunroof', 'sunroofStatus', { action: this.sunroofAction }, `Sunroof: ${this.sunroofAction}`);
  }

  setHeatedSteering(enable: boolean): void {
    this.executeCmd('heatedSteeringWheel', 'heatedSteeringStatus', { enable }, `Heated steering ${enable ? 'on' : 'off'}`);
  }

  setFrontDefrost(enable: boolean): void {
    this.executeCmd('frontDefrost', 'frontDefrostStatus', { enable }, `Front defrost ${enable ? 'on' : 'off'}`);
  }

  setRearWindowHeat(enable: boolean): void {
    this.executeCmd('rearWindowHeat', 'rearWindowHeatStatus', { enable }, `Rear window heat ${enable ? 'on' : 'off'}`);
  }

  applySeatsHeat(): void {
    this.executeCmd('heatedSeats', 'seatsHeatStatus',
      { driverLevel: this.seatHeatDriverLevel, passengerLevel: this.seatHeatPassengerLevel },
      'Seat heating applied');
  }

  setCableLock(lock: boolean): void {
    this.executeCmd('chargingCableLock', 'cableLockStatus', { lock }, `Cable ${lock ? 'locked' : 'unlocked'}`);
  }

  applyChargeCurrent(): void {
    this.executeCmd('setChargeCurrent', 'chargeCurrentStatus', { current: this.chargeCurrent },
      `Charge current set to ${this.chargeCurrent}`);
  }

  applyChargingSchedule(): void {
    this.executeCmd('chargingSchedule', 'chargingScheduleStatus', {
      startTime: this.chargingScheduleStart,
      endTime: this.chargingScheduleEnd,
      mode: this.chargingScheduleMode
    }, 'Charging schedule applied');
  }

  applyBatteryHeatingSchedule(): void {
    this.executeCmd('batteryHeatingSchedule', 'batteryHeatingScheduleStatus', {
      startTime: this.batteryHeatingStart,
      mode: this.batteryHeatingMode
    }, 'Battery heating schedule applied');
  }
}
