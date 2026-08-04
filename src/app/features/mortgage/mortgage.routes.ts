import { Routes } from '@angular/router';

import { managementSummaryGuard } from './management-summary.guard';

export const MORTGAGE_ROUTES: Routes = [
  {
    path: 'management-summary',
    canActivate: [managementSummaryGuard],
    loadComponent: () =>
      import('../../pages/management-summary/management-summary.component').then(
        (m) => m.ManagementSummaryComponent,
      ),
  },
  {
    path: 'management-summary/:loanAliasKey/loan-detail',
    canActivate: [managementSummaryGuard],
    loadComponent: () =>
      import('../../pages/loan-detail-report/loan-detail-report.component').then(
        (m) => m.LoanDetailReportComponent,
      ),
  },
  {
    path: 'loan-alias',
    loadComponent: () =>
      import('../../pages/loan-alias/loan-alias.component').then((m) => m.LoanAliasComponent),
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
      import('../../pages/loans-ranking/loans-ranking.component').then(
        (m) => m.LoansRankingComponent,
      ),
  },
  {
    path: 'investor-alias',
    loadComponent: () =>
      import('../../pages/investor-alias/investor-alias.component').then(
        (m) => m.InvestorAliasComponent,
      ),
  },
  {
    path: 'investor-alias-assignment',
    loadComponent: () =>
      import('../../pages/investor/investor.component').then((m) => m.InvestorComponent),
  },
  {
    path: 'loan-exposure-markers',
    redirectTo: 'security-value',
    pathMatch: 'full',
  },
  {
    path: 'security-value',
    loadComponent: () =>
      import('../../pages/security-value/security-value.component').then(
        (m) => m.SecurityValueComponent,
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
    redirectTo: 'other-cost-capture',
    pathMatch: 'full',
  },
  {
    path: 'other-cost-capture',
    loadComponent: () =>
      import('../../pages/other-cost-capture/other-cost-capture.component').then(
        (m) => m.OtherCostCaptureComponent,
      ),
  },
  {
    path: 'default-date-capture',
    loadComponent: () =>
      import('../../pages/default-date-capture/default-date-capture.component').then(
        (m) => m.DefaultDateCaptureComponent,
      ),
  },
  {
    path: 'default-date',
    redirectTo: 'default-date-capture',
    pathMatch: 'full',
  },
  {
    path: 'default-subjective-analytics',
    loadComponent: () =>
      import('../../pages/default-subjective-analytics/default-subjective-analytics.component').then(
        (m) => m.DefaultSubjectiveAnalyticsComponent,
      ),
  },
  {
    path: 'tax-arrears-capture',
    loadComponent: () =>
      import('../../pages/tax-arrears-capture/tax-arrears-capture.component').then(
        (m) => m.TaxArrearsCaptureComponent,
      ),
  },
  {
    path: 'tax-arrears',
    redirectTo: 'tax-arrears-capture',
    pathMatch: 'full',
  },
  {
    path: 'ltv-validation',
    loadComponent: () =>
      import('../../pages/ltv-validation/ltv-validation.component').then(
        (m) => m.LtvValidationComponent,
      ),
  },
  {
    path: 'non-ks-serviced-loans',
    loadComponent: () =>
      import('../../pages/non-ks-serviced-loans/non-ks-serviced-loans.component').then(
        (m) => m.NonKsServicedLoansComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('../../pages/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
];
