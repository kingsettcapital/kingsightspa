import { Routes } from '@angular/router';

import { homeCapitalDataExplorerGuard } from '../../core/access/access.guards';

const comingSoon = () =>
  import('./cmhc-coming-soon.component').then((m) => m.CmhcComingSoonComponent);

export const CMHC_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [homeCapitalDataExplorerGuard],
    loadComponent: () =>
      import('./cmhc-dashboard.component').then((m) => m.CmhcDashboardComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./overview/cmhc-overview.component').then((m) => m.CmhcOverviewComponent),
      },
      // Tabs below are built in later steps.
      { path: 'underwriter', loadComponent: comingSoon, data: { title: 'Underwriter' } },
      { path: 'originator', loadComponent: comingSoon, data: { title: 'Originator' } },
      { path: 'reviewer', loadComponent: comingSoon, data: { title: 'Reviewer' } },
      { path: 'capacity', loadComponent: comingSoon, data: { title: 'Capacity' } },
      { path: 'pools', loadComponent: comingSoon, data: { title: 'Pools' } },
      { path: 'timelines', loadComponent: comingSoon, data: { title: 'Timelines' } },
      { path: 'data-issues', loadComponent: comingSoon, data: { title: 'Data Issues' } },
      { path: 'methodology', loadComponent: comingSoon, data: { title: 'Methodology' } },
    ],
  },
];
