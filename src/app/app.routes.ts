import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'mortgage/ranking',
        loadComponent: () =>
          import('./pages/ranking/ranking.component').then(
            (m) => m.RankingComponent
          ),
      },
      {
        path: 'mortgage/loan-alias',
        loadComponent: () =>
          import('./pages/loan-alias/loan-alias.component').then(
            (m) => m.LoanAliasComponent
          ),
      },
      {
        path: 'mortgage/loans-ranking',
        loadComponent: () =>
          import('./pages/loans-ranking/loans-ranking.component').then(
            (m) => m.LoansRankingComponent
          ),
      },
      {
        path: 'mortgage/investor-alias',
        loadComponent: () =>
          import('./pages/investor-alias/investor-alias.component').then(
            (m) => m.InvestorAliasComponent
          ),
      },
      {
        path: 'mortgage/security-value',
        loadComponent: () =>
          import('./pages/security-value/security-value.component').then(
            (m) => m.SecurityValueComponent
          ),
      },
      {
        path: 'capital-reporting/fund',
        loadComponent: () =>
          import('./pages/fund/fund.component').then((m) => m.FundComponent),
      },
      {
        path: 'capital-reporting/asset',
        loadComponent: () =>
          import('./pages/asset/asset.component').then((m) => m.AssetComponent),
      },
      {
        path: 'capital-reporting/investor',
        loadComponent: () =>
          import('./pages/investor/investor.component').then(
            (m) => m.InvestorComponent
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then(
            (m) => m.NotFoundComponent
          ),
      },
    ],
  },
];
