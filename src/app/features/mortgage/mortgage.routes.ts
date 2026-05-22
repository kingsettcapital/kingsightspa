import { Routes } from '@angular/router';

export const MORTGAGE_ROUTES: Routes = [
  {
    path: 'ranking',
    loadComponent: () =>
      import('./ranking/ranking.component').then((m) => m.RankingComponent),
  },
  {
    path: 'loan-alias',
    loadComponent: () =>
      import('./loan-alias/loan-alias.component').then((m) => m.LoanAliasComponent),
  },
  {
    path: 'loans-ranking',
    loadComponent: () =>
      import('./loans-ranking/loans-ranking.component').then(
        (m) => m.LoansRankingComponent
      ),
  },
  {
    path: 'investor-alias',
    loadComponent: () =>
      import('./investor-alias/investor-alias.component').then(
        (m) => m.InvestorAliasComponent
      ),
  },
  {
    path: 'security-value',
    loadComponent: () =>
      import('./security-value/security-value.component').then(
        (m) => m.SecurityValueComponent
      ),
  },
  {
    path: 'other-cost',
    loadComponent: () =>
      import('./other-cost/other-cost.component').then((m) => m.OtherCostComponent),
  },
];
