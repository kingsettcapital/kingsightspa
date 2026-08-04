import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { MORTGAGE_DEFAULT_ROUTE } from './mortgage-nav.config';

/** Blocks Management Summary until `environment.managementSummaryEnabled` is true. */
export const managementSummaryGuard: CanActivateFn = () => {
  if (environment.managementSummaryEnabled === true) {
    return true;
  }

  return inject(Router).createUrlTree(['/mortgage', MORTGAGE_DEFAULT_ROUTE]);
};
