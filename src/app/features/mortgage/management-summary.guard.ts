import { CanActivateFn } from '@angular/router';

import { environment } from '../../../environments/environment';
import { managementSummaryFeatureGuard } from '../../core/access/access.guards';

/**
 * Blocks Management Summary when the env flag is off — unless the user is admin.
 */
export const managementSummaryGuard: CanActivateFn = (route, state) => {
  if (environment.managementSummaryEnabled === true) {
    return true;
  }
  return managementSummaryFeatureGuard(route, state);
};
