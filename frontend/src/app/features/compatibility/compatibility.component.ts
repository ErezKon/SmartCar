import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SmartcarApiService } from '../../core/services/smartcar-api.service';
import { CompatibleVehicle } from '../../core/models';

@Component({
  selector: 'app-compatibility',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatTableModule,
    MatProgressSpinnerModule, MatChipsModule, MatSnackBarModule
  ],
  templateUrl: './compatibility.component.html',
  styleUrl: './compatibility.component.scss'
})
export class CompatibilityComponent implements OnInit {
  region: string = '';
  make: string = '';
  powertrainType: string = '';
  vehicles: CompatibleVehicle[] = [];
  loading = false;
  mgLoading = false;
  mgVehicles: CompatibleVehicle[] = [];
  displayedColumns = ['make', 'model', 'year', 'powertrainType', 'capabilities'];

  constructor(private api: SmartcarApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadMgCompatibility();
  }

  loadMgCompatibility(): void {
    this.mgLoading = true;
    this.api.getMgCompatibility().subscribe({
      next: res => {
        this.mgVehicles = res.data || [];
        this.mgLoading = false;
      },
      error: () => { this.mgLoading = false; }
    });
  }

  search(): void {
    this.loading = true;
    const filters: any = {};
    if (this.region) filters.region = this.region;
    if (this.make) filters.make = this.make;
    if (this.powertrainType) filters.powertrainType = this.powertrainType;
    this.api.getCompatibleVehicles(filters).subscribe({
      next: res => {
        this.vehicles = res.data || [];
        this.loading = false;
        this.snackBar.open(`Found ${this.vehicles.length} compatible vehicle(s)`, 'OK', { duration: 3000 });
      },
      error: (err: any) => {
        this.loading = false;
        this.snackBar.open(err.message || 'Search failed', 'OK', { duration: 3000 });
      }
    });
  }

  clearFilters(): void {
    this.region = '';
    this.make = '';
    this.powertrainType = '';
    this.vehicles = [];
  }
}
