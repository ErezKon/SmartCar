import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'connect',
    loadComponent: () => import('./features/connect/connect.component').then(m => m.ConnectComponent)
  },
  {
    path: 'signals',
    loadComponent: () => import('./features/signals/signals.component').then(m => m.SignalsComponent)
  },
  {
    path: 'commands',
    loadComponent: () => import('./features/commands/commands.component').then(m => m.CommandsComponent)
  },
  {
    path: 'webhooks',
    loadComponent: () => import('./features/webhooks/webhooks.component').then(m => m.WebhooksComponent)
  },
  {
    path: 'compatibility',
    loadComponent: () => import('./features/compatibility/compatibility.component').then(m => m.CompatibilityComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
  },
  {
    path: 'saic/connect',
    loadComponent: () => import('./features/saic/saic-connect.component').then(m => m.SaicConnectComponent)
  },
  {
    path: 'saic/dashboard',
    loadComponent: () => import('./features/saic/saic-dashboard.component').then(m => m.SaicDashboardComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
