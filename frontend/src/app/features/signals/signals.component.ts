import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { Subscription } from 'rxjs';
import { SmartcarApiService } from '../../core/services/smartcar-api.service';
import { AuthService } from '../../core/services/auth.service';
import { SignalCodeInfo, SignalValue } from '../../core/models';
import { SignalCardComponent } from '../../shared/components/signal-card/signal-card.component';

@Component({
  selector: 'app-signals',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatExpansionModule, MatProgressSpinnerModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatChipsModule, MatBadgeModule,
    SignalCardComponent
  ],
  templateUrl: './signals.component.html',
  styleUrl: './signals.component.scss'
})
export class SignalsComponent implements OnInit, OnDestroy {
  catalogGroups: Record<string, SignalCodeInfo[]> = {};
  groupNames: string[] = [];
  signalValues: Map<string, { value: any; dataAge: string | null }> = new Map();
  loading = false;
  catalogLoading = true;
  searchFilter: string = '';
  vehicleId: string | null = null;
  userId: string | null = null;
  totalSignals: number = 0;
  private subs: Subscription[] = [];

  constructor(
    private api: SmartcarApiService,
    private auth: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCatalog();
    this.subs.push(
      this.auth.vehicleId$.subscribe(id => this.vehicleId = id),
      this.auth.userId$.subscribe(id => this.userId = id)
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.api.getSignalsCatalog().subscribe({
      next: res => {
        this.catalogGroups = res.groups;
        this.groupNames = Object.keys(res.groups).sort();
        this.totalSignals = res.totalSignals;
        this.catalogLoading = false;
      },
      error: err => {
        this.catalogLoading = false;
        this.snackBar.open('Failed to load signal catalog', 'OK', { duration: 3000 });
      }
    });
  }

  fetchAllSignals(): void {
    if (!this.vehicleId || !this.userId) {
      this.snackBar.open('Select a vehicle first', 'OK', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.api.getSignals(this.vehicleId, this.userId).subscribe({
      next: res => {
        this.signalValues.clear();
        (res.data || []).forEach((s: SignalValue) => {
          this.signalValues.set(s.attributes.code, {
            value: s.attributes.value,
            dataAge: s.attributes.dataAge
          });
        });
        this.loading = false;
        this.snackBar.open(`Loaded ${this.signalValues.size} signals`, 'OK', { duration: 3000 });
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(err.message || 'Failed to fetch signals', 'OK', { duration: 3000 });
      }
    });
  }

  fetchSignal(code: string): void {
    if (!this.vehicleId || !this.userId) {
      this.snackBar.open('Select a vehicle first', 'OK', { duration: 3000 });
      return;
    }
    this.api.getSignal(this.vehicleId, code, this.userId).subscribe({
      next: res => {
        this.signalValues.set(res.data.attributes.code, {
          value: res.data.attributes.value,
          dataAge: res.data.attributes.dataAge
        });
        this.snackBar.open(`Updated ${code}`, 'OK', { duration: 2000 });
      },
      error: err => {
        this.snackBar.open(err.message || `Failed to fetch ${code}`, 'OK', { duration: 3000 });
      }
    });
  }

  getSignalValue(code: string): any {
    return this.signalValues.get(code)?.value ?? null;
  }

  getSignalAge(code: string): string | null {
    return this.signalValues.get(code)?.dataAge ?? null;
  }

  filteredGroups(): string[] {
    if (!this.searchFilter) return this.groupNames;
    const filter = this.searchFilter.toLowerCase();
    return this.groupNames.filter(g => {
      if (g.toLowerCase().includes(filter)) return true;
      return this.catalogGroups[g].some(s =>
        s.code.toLowerCase().includes(filter) || s.description.toLowerCase().includes(filter)
      );
    });
  }

  filteredSignals(group: string): SignalCodeInfo[] {
    if (!this.searchFilter) return this.catalogGroups[group];
    const filter = this.searchFilter.toLowerCase();
    if (group.toLowerCase().includes(filter)) return this.catalogGroups[group];
    return this.catalogGroups[group].filter(s =>
      s.code.toLowerCase().includes(filter) || s.description.toLowerCase().includes(filter)
    );
  }

  getGroupSignalCount(group: string): number {
    return this.catalogGroups[group]?.length || 0;
  }
}
