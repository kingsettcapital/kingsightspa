import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { cmhcGuard } from '../../core/access/access.guards';
import { CmhcAccessService, CmhcPage } from './cmhc-access.service';

/**
 * A page the user's CMHC sub-role can't open — or one hidden by config (Timelines, Capacity) — redirects to
 * their home page: Overview, or Reviewer for Reviewers (NAV-12). No role at all lands on Overview,
 * where the shell shows the no-access message.
 */
const cmhcPageGuard =
  (page: CmhcPage): CanActivateFn =>
  async () => {
    const access = inject(CmhcAccessService);
    const router = inject(Router);
    await access.ensureLoaded();
    if (access.canOpen(page)) return true;
    const home = access.homePage();
    if (!home && page === 'overview') return true;
    return router.createUrlTree(['/cmhc-dashboard', home ?? 'overview']);
  };

/** Empty path goes to the user's home page. */
const homeRedirectGuard: CanActivateFn = async () => {
  // inject() only works before the first await (injection context ends there).
  const access = inject(CmhcAccessService);
  const router = inject(Router);
  await access.ensureLoaded();
  return router.createUrlTree(['/cmhc-dashboard', access.homePage() ?? 'overview']);
};

const personView = () =>
  import('./person/cmhc-person-view.component').then((m) => m.CmhcPersonViewComponent);

export const CMHC_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [cmhcGuard],
    loadComponent: () =>
      import('./cmhc-dashboard.component').then((m) => m.CmhcDashboardComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      {
        path: 'overview',
        canActivate: [cmhcPageGuard('overview')],
        loadComponent: () =>
          import('./overview/cmhc-overview.component').then((m) => m.CmhcOverviewComponent),
      },
      // Underwriter, Originator, Reviewer and Pools share one person-view component.
      { path: 'underwriter', canActivate: [cmhcPageGuard('underwriter')], loadComponent: personView, data: { type: 'uw' } },
      { path: 'originator', canActivate: [cmhcPageGuard('originator')], loadComponent: personView, data: { type: 'orig' } },
      { path: 'reviewer', canActivate: [cmhcPageGuard('reviewer')], loadComponent: personView, data: { type: 'rev' } },
      {
        path: 'capacity',
        canActivate: [cmhcPageGuard('capacity')],
        loadComponent: () =>
          import('./capacity/cmhc-capacity.component').then((m) => m.CmhcCapacityComponent),
      },
      { path: 'pools', canActivate: [cmhcPageGuard('pools')], loadComponent: personView, data: { type: 'pool' } },
      {
        path: 'timelines',
        canActivate: [cmhcPageGuard('timelines')],
        loadComponent: () =>
          import('./timelines/cmhc-timelines.component').then((m) => m.CmhcTimelinesComponent),
      },
      {
        path: 'data-issues',
        canActivate: [cmhcPageGuard('data-issues')],
        loadComponent: () =>
          import('./data-issues/cmhc-data-issues.component').then((m) => m.CmhcDataIssuesComponent),
      },
      {
        path: 'methodology',
        canActivate: [cmhcPageGuard('methodology')],
        loadComponent: () =>
          import('./methodology/cmhc-methodology.component').then((m) => m.CmhcMethodologyComponent),
      },
      { path: '**', canActivate: [homeRedirectGuard], children: [] },
    ],
  },
];
