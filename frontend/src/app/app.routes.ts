import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'saic/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/smart-car/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'connect',
    loadComponent: () => import('./features/smart-car/connect/connect.component').then(m => m.ConnectComponent)
  },
  {
    path: 'signals',
    loadComponent: () => import('./features/smart-car/signals/signals.component').then(m => m.SignalsComponent)
  },
  {
    path: 'commands',
    loadComponent: () => import('./features/smart-car/commands/commands.component').then(m => m.CommandsComponent)
  },
  {
    path: 'webhooks',
    loadComponent: () => import('./features/smart-car/webhooks/webhooks.component').then(m => m.WebhooksComponent)
  },
  {
    path: 'compatibility',
    loadComponent: () => import('./features/smart-car/compatibility/compatibility.component').then(m => m.CompatibilityComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/smart-car/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'saic/connect',
    loadComponent: () => import('./features/saic/connect/saic-connect.component').then(m => m.SaicConnectComponent)
  },
  {
    path: 'saic/dashboard',
    loadComponent: () => import('./features/saic/dashboard/saic-dashboard.component').then(m => m.SaicDashboardComponent)
  },
  {
    path: 'saic/statistics',
    loadComponent: () => import('./features/saic/statistics/saic-statistics.component').then(m => m.SaicStatisticsComponent)
  },
  {
    path: 'saic/alarms',
    loadComponent: () => import('./features/saic/alarms/saic-alarms.component').then(m => m.SaicAlarmsComponent)
  },
  { path: '**', redirectTo: 'saic/dashboard' }
];
