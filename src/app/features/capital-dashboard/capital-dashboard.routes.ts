import { Routes } from '@angular/router';

export const CAPITAL_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./capital-dashboard/capital-dashboard.component').then((m) => m.CapitalDashboardComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'investor' },
      {
        path: 'investor',
        loadComponent: () =>
          import('./investors/capital-dashboard-investors.component').then(
            (m) => m.CapitalDashboardInvestorsComponent,
          ),
      },
      {
        path: 'investment',
        loadComponent: () =>
          import('./investments/capital-dashboard-investments.component').then(
            (m) => m.CapitalDashboardInvestmentsComponent,
          ),
      },
      {
        path: 'asset',
        loadComponent: () =>
          import('./assets/capital-dashboard-assets.component').then((m) => m.CapitalDashboardAssetsComponent),
      },
    ],
  },
];

