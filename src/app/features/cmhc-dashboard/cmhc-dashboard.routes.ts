import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { environment } from '../../../environments/environment';
import { cmhcGuard } from '../../core/access/access.guards';

/** Capacity is shown to everyone unless the environment flag switches it off (to be tied to a permission later). */
const capacityTabGuard = () =>
  environment.showCmhcCapacityTab !== false || inject(Router).createUrlTree(['/cmhc-dashboard', 'overview']);

const personView = () =>
  import('./person/cmhc-person-view.component').then((m) => m.CmhcPersonViewComponent);

export const CMHC_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [cmhcGuard],
    loadComponent: () =>
      import('./cmhc-dashboard.component').then((m) => m.CmhcDashboardComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./overview/cmhc-overview.component').then((m) => m.CmhcOverviewComponent),
      },
      // Underwriter, Originator, Reviewer and Pools share one person-view component.
      { path: 'underwriter', loadComponent: personView, data: { type: 'uw' } },
      { path: 'originator', loadComponent: personView, data: { type: 'orig' } },
      { path: 'reviewer', loadComponent: personView, data: { type: 'rev' } },
      {
        path: 'capacity',
        canActivate: [capacityTabGuard],
        loadComponent: () =>
          import('./capacity/cmhc-capacity.component').then((m) => m.CmhcCapacityComponent),
      },
      { path: 'pools', loadComponent: personView, data: { type: 'pool' } },
      {
        path: 'timelines',
        loadComponent: () =>
          import('./timelines/cmhc-timelines.component').then((m) => m.CmhcTimelinesComponent),
      },
      {
        path: 'data-issues',
        loadComponent: () =>
          import('./data-issues/cmhc-data-issues.component').then((m) => m.CmhcDataIssuesComponent),
      },
      {
        path: 'methodology',
        loadComponent: () =>
          import('./methodology/cmhc-methodology.component').then((m) => m.CmhcMethodologyComponent),
      },
    ],
  },
];
