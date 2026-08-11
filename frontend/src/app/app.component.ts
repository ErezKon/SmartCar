import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';
import { VehicleSelectorComponent } from './shared/components/vehicle-selector/vehicle-selector.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatSidenavModule, MatToolbarModule,
    MatListModule, MatIconModule, MatButtonModule, VehicleSelectorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Smartcar';

  navItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/connect', icon: 'link', label: 'Connect' },
    { path: '/signals', icon: 'sensors', label: 'Signals' },
    { path: '/commands', icon: 'gamepad', label: 'Commands' },
    { path: '/webhooks', icon: 'webhook', label: 'Webhooks' },
    { path: '/compatibility', icon: 'verified', label: 'Compatibility' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.auth.refreshStatus().subscribe();
  }
}
