import { Routes } from '@angular/router';

export const CAPITAL_REPORTING_ROUTES: Routes = [
  {
    path: 'fund',
    loadComponent: () =>
      import('./fund/fund.component').then((m) => m.FundComponent),
  },
  {
    path: 'asset',
    loadComponent: () =>
      import('./asset/asset.component').then((m) => m.AssetComponent),
  },
  {
    path: 'investor',
    loadComponent: () =>
      import('./investor/investor.component').then((m) => m.InvestorComponent),
  },
];
