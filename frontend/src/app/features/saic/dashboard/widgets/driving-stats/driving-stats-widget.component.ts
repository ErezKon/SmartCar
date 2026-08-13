import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-driving-stats-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './driving-stats-widget.component.html',
  styleUrl: './driving-stats-widget.component.scss'
})
export class DrivingStatsWidgetComponent {
  @Input() mileageToday = 'N/A';
  @Input() energyToday = 'N/A';
  @Input() mileageSinceCharge = 'N/A';
  @Input() energySinceCharge = 'N/A';
  @Input() lightsStatus: { mainBeam: boolean; dippedBeam: boolean; sideLight: boolean } | null = null;
}
