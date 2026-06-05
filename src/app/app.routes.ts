import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./shared/components/auth-login/auth-login.component').then(
        (m) => m.AuthLoginComponent
      ),
  },
  {
    path: 'login-failed',
    loadComponent: () =>
      import('./shared/components/login-failed/login-failed.component').then(
        (m) => m.LoginFailedComponent
      ),
  },
  {
    path: '',
    canActivate: environment.requireLogin ? [MsalGuard] : [],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES
          ),
      },
      {
        path: 'capital-dashboard',
        loadChildren: () =>
          import('./features/capital-dashboard/capital-dashboard.routes').then(
            (m) => m.CAPITAL_DASHBOARD_ROUTES
          ),
      },
      {
        path: 'mortgage',
        loadChildren: () =>
          import('./features/mortgage/mortgage.routes').then(
            (m) => m.MORTGAGE_ROUTES
          ),
      },
      {
        path: 'capital-reporting',
        loadChildren: () =>
          import('./features/capital-reporting/capital-reporting.routes').then(
            (m) => m.CAPITAL_REPORTING_ROUTES
          ),
      },
      {
        path: 'data-explorer',
        loadChildren: () =>
          import('./features/data-explorer/data-explorer.routes').then(
            (m) => m.DATA_EXPLORER_ROUTES
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/components/not-found/not-found.component').then(
            (m) => m.NotFoundComponent
          ),
      },
    ],
  },
];
