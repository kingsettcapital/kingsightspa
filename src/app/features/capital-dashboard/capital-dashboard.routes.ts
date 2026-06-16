import { Routes } from '@angular/router';

import { provideCapitalDashboardStore } from './store';

export const CAPITAL_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./capital-dashboard/capital-dashboard.component').then((m) => m.CapitalDashboardComponent),
    providers: [...provideCapitalDashboardStore()],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/capital-dashboard-dashboard.component').then(
            (m) => m.CapitalDashboardDashboardComponent,
          ),
      },
      {
        path: 'investor/:investorKey',
        loadComponent: () =>
          import('./investors/investor-detail/investor-detail.component').then(
            (m) => m.InvestorDetailComponent,
          ),
      },
      {
        path: 'investor',
        loadComponent: () =>
          import('./investors/capital-dashboard-investors.component').then(
            (m) => m.CapitalDashboardInvestorsComponent,
          ),
      },
      {
        path: 'investment/:fundKey',
        loadComponent: () =>
          import('./investments/investment-detail/investment-detail.component').then(
            (m) => m.InvestmentDetailComponent,
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
        path: 'asset/:propertyKey',
        loadComponent: () =>
          import('./assets/asset-detail/asset-detail.component').then((m) => m.AssetDetailComponent),
      },
      {
        path: 'asset',
        loadComponent: () =>
          import('./assets/capital-dashboard-assets.component').then((m) => m.CapitalDashboardAssetsComponent),
      },
    ],
  },
];

