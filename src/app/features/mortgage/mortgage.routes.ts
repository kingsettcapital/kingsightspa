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
    path: 'loan-alias-assignment',
    loadComponent: () =>
      import('../../pages/loan-alias-assignment/loan-alias-assignment.component').then(
        (m) => m.LoanAliasAssignmentComponent,
      ),
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
    path: 'cmhc-upload',
    loadComponent: () =>
      import('../../pages/cmhc-upload/cmhc-upload.component').then(
        (m) => m.CmhcUploadComponent,
      ),
  },
  {
    path: 'other-cost',
    loadComponent: () =>
      import('./other-cost/other-cost.component').then((m) => m.OtherCostComponent),
  },
  {
    path: 'other-cost-capture',
    loadComponent: () =>
      import('../../pages/other-cost-capture/other-cost-capture.component').then(
        (m) => m.OtherCostCaptureComponent,
      ),
  },
  {
    path: 'default-date',
    loadComponent: () =>
      import('./default-date/default-date.component').then((m) => m.DefaultDateComponent),
  },
  {
    path: 'default-subjective-analytics',
    loadComponent: () =>
      import('./default-subjective-analytics/default-subjective-analytics.component').then(
        (m) => m.DefaultSubjectiveAnalyticsComponent,
      ),
  },
  {
    path: 'tax-arrears',
    loadComponent: () =>
      import('./tax-arrears/tax-arrears.component').then((m) => m.TaxArrearsComponent),
  },
  {
    path: 'ltv-validation',
    loadComponent: () =>
      import('./ltv-validation/ltv-validation.component').then((m) => m.LtvValidationComponent),
  },
  {
    path: 'non-ks-serviced-loans',
    loadComponent: () =>
      import('../../pages/non-ks-serviced-loans/non-ks-serviced-loans.component').then(
        (m) => m.NonKsServicedLoansComponent,
      ),
  },
];
