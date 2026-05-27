import { Routes } from '@angular/router';

export const CAPITAL_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./capital-dashboard/capital-dashboard.component').then(
        (m) => m.CapitalDashboardComponent
      ),
  },
];

