import { Component, inject } from '@angular/core';
import { CanActivateFn, Route, Router, Routes } from '@angular/router';

import { cmhcGuard } from '../../core/access/access.guards';
import { CMHC_PAGES, CmhcAccessService, CmhcPage } from './cmhc-access.service';

/**
 * A page the user's CMHC sub-role can't open — or one hidden by config (Timelines, Renewals, FFA, Capacity) —
 * redirects to their home page: Overview, or Reviewer for Reviewers (NAV-12). No role at all lands on Overview,
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

/** Pages are drawn by the hosted MMG dashboard; each route only runs its guard (see cmhc-dashboard.component). */
@Component({ selector: 'app-cmhc-page', standalone: true, template: '' })
class CmhcPageComponent {}

const page = (path: CmhcPage): Route => ({ path, canActivate: [cmhcPageGuard(path)], component: CmhcPageComponent });

export const CMHC_DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    canActivate: [cmhcGuard],
    loadComponent: () =>
      import('./cmhc-dashboard.component').then((m) => m.CmhcDashboardComponent),
    children: [
      { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
      ...CMHC_PAGES.map((p) => page(p.path)),
      { path: '**', canActivate: [homeRedirectGuard], children: [] },
    ],
  },
];
