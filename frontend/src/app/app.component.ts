import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subscription } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { ProviderService } from './core/services/provider.service';
import { ProviderType } from './core/models/saic.models';
import { VehicleSelectorComponent } from './shared/components/vehicle-selector/vehicle-selector.component';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  provider?: 'smartcar' | 'saic' | 'both';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatSidenavModule, MatToolbarModule,
    MatListModule, MatIconModule, MatButtonModule, MatButtonToggleModule,
    VehicleSelectorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  title = 'Smartcar';
  activeProvider: ProviderType = 'smartcar';
  isMobile = false;
  private subs: Subscription[] = [];

  allNavItems: NavItem[] = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard', provider: 'smartcar' },
    { path: '/connect', icon: 'link', label: 'Connect', provider: 'smartcar' },
    { path: '/signals', icon: 'sensors', label: 'Signals', provider: 'smartcar' },
    { path: '/commands', icon: 'gamepad', label: 'Commands', provider: 'smartcar' },
    { path: '/webhooks', icon: 'webhook', label: 'Webhooks', provider: 'smartcar' },
    { path: '/compatibility', icon: 'verified', label: 'Compatibility', provider: 'smartcar' },
    { path: '/saic/dashboard', icon: 'electric_car', label: 'SAIC Dashboard', provider: 'saic' },
    { path: '/saic/statistics', icon: 'bar_chart', label: 'Statistics', provider: 'saic' },
    { path: '/saic/connect', icon: 'login', label: 'SAIC Connect', provider: 'saic' },
    { path: '/settings', icon: 'settings', label: 'Settings', provider: 'both' },
  ];

  get navItems(): NavItem[] {
    return this.allNavItems.filter(item =>
      item.provider === 'both' || item.provider === this.activeProvider
    );
  }

  constructor(
    private auth: AuthService,
    private providerService: ProviderService,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    this.auth.refreshStatus().subscribe();
    this.subs.push(
      this.providerService.activeProvider$.subscribe(p => {
        this.activeProvider = p;
      }),
      this.breakpointObserver.observe([Breakpoints.Handset]).subscribe(result => {
        this.isMobile = result.matches;
        if (this.sidenav) {
          if (this.isMobile) {
            this.sidenav.close();
          } else {
            this.sidenav.open();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  onProviderChange(provider: ProviderType): void {
    this.providerService.setProvider(provider);
  }

  onNavClick(): void {
    if (this.isMobile) {
      this.sidenav.close();
    }
  }
}
