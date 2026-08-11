import { Routes } from '@angular/router';

import { homeCapitalDataExplorerGuard } from '../../core/access/access.guards';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [homeCapitalDataExplorerGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
];
