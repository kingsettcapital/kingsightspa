import { Routes } from '@angular/router';

import { environment } from '../../../environments/environment';
import { MORTGAGE_DEFAULT_ROUTE } from '../mortgage/mortgage-nav.config';

export const DASHBOARD_ROUTES: Routes = [
  environment.showHomeCapitalAndDataExplorer === true
    ? {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      }
    : {
        path: '',
        pathMatch: 'full',
        redirectTo: `mortgage/${MORTGAGE_DEFAULT_ROUTE}`,
      },
];
