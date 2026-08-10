import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccessControlService } from './access-control.service';
import { MORTGAGE_DEFAULT_ROUTE } from '../../features/mortgage/mortgage-nav.config';

function whenAccessReady<T>(decide: (access: AccessControlService) => T) {
  const access = inject(AccessControlService);

  if (!access.isLoading()) {
    return decide(access);
  }

  return toObservable(access.isLoading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() => decide(access)),
  );
}

function mortgageFallback(router: Router) {
  return router.createUrlTree(['/mortgage', MORTGAGE_DEFAULT_ROUTE]);
}

/** admin (active user_master role) only. */
export const userManagementGuard: CanActivateFn = () => {
  const router = inject(Router);
  return whenAccessReady((access) =>
    access.canAccessUserManagement() ? true : mortgageFallback(router),
  );
};

/**
 * Allows a route when the env feature flag is on, or the signed-in user is admin.
 * Used so UAT can hide sections for everyone except admin.
 */
export function featureFlagOrAdminGuard(flagEnabled: boolean | undefined): CanActivateFn {
  return () => {
    const router = inject(Router);
    return whenAccessReady((access) =>
      access.isFeatureVisible(flagEnabled) ? true : mortgageFallback(router),
    );
  };
}

export const homeCapitalDataExplorerGuard = featureFlagOrAdminGuard(
  environment.showHomeCapitalAndDataExplorer,
);

export const managementSummaryFeatureGuard = featureFlagOrAdminGuard(
  environment.managementSummaryEnabled,
);
