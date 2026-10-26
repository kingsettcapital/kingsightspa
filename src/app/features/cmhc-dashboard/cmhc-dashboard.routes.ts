import { Routes } from '@angular/router';

import { homeCapitalDataExplorerGuard } from '../../core/access/access.guards';

const personView = () =>
  import('./person/cmhc-person-view.component').then((m) => m.CmhcPersonViewComponent);

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
      // Person views share one component; the tabs below them are built in later steps.
      { path: 'underwriter', loadComponent: personView, data: { type: 'uw' } },
      { path: 'originator', loadComponent: personView, data: { type: 'orig' } },
      { path: 'reviewer', loadComponent: personView, data: { type: 'rev' } },
      { path: 'capacity', loadComponent: comingSoon, data: { title: 'Capacity' } },
      { path: 'pools', loadComponent: personView, data: { type: 'pool' } },
      { path: 'timelines', loadComponent: comingSoon, data: { title: 'Timelines' } },
      { path: 'data-issues', loadComponent: comingSoon, data: { title: 'Data Issues' } },
      { path: 'methodology', loadComponent: comingSoon, data: { title: 'Methodology' } },
    ],
  },
];
