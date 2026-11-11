import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, timeout, catchError, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccessControlService } from './access-control.service';
import { AppSection } from './access.model';

/** Give up waiting for the role lookup after this long and decide with what we have. */
const ACCESS_READY_TIMEOUT_MS = 15000;

function whenAccessReady<T>(decide: (access: AccessControlService) => T) {
  const access = inject(AccessControlService);

  if (access.isReady()) {
    return decide(access);
  }

  return toObservable(access.isReady).pipe(
    filter((ready) => ready),
    take(1),
    timeout(ACCESS_READY_TIMEOUT_MS),
    catchError(() => of(true)),
    map(() => decide(access)),
  );
}

function defaultRouteFor(access: AccessControlService, router: Router) {
  return router.parseUrl(access.defaultRoute());
}

/** Blocks the whole Mortgage area (including direct URLs) when the env flag is off. */
export const mortgageEnabledGuard: CanMatchFn = () =>
  environment.showMortgage === false
    ? inject(Router).createUrlTree(['/capital-dashboard'])
    : true;

/** Allows the route when the user's role (and env flag) allows the section; otherwise sends them to their default page. */
export function sectionGuard(section: AppSection): CanActivateFn {
  return () => {
    const router = inject(Router);
    return whenAccessReady((access) =>
      access.canAccessSection(section) ? true : defaultRouteFor(access, router),
    );
  };
}

/** admin (active user_master role) only. */
export const userManagementGuard = sectionGuard('userManagement');

export const homeGuard = sectionGuard('home');
export const capitalGuard = sectionGuard('capital');
export const cmhcGuard = sectionGuard('cmhc');
export const mortgageGuard = sectionGuard('mortgage');
export const dataExplorerGuard = sectionGuard('dataExplorer');

/**
 * Allows a route when the env feature flag is on, or the signed-in user is admin.
 * Used so UAT can hide sections for everyone except admin.
 */
export function featureFlagOrAdminGuard(flagEnabled: boolean | undefined): CanActivateFn {
  return () => {
    const router = inject(Router);
    return whenAccessReady((access) =>
      access.isFeatureVisible(flagEnabled) ? true : defaultRouteFor(access, router),
    );
  };
}

export const managementSummaryFeatureGuard = featureFlagOrAdminGuard(
  environment.managementSummaryEnabled,
);
