import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { SECURITY_VALUE_EXAMPLE_DATA } from '../constants/security-value-example.data';
import {
  SecurityValueApiRecord,
  SecurityValueBulkUpdateRequest,
} from '../interfaces/security-value.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live security value API is ready. */
const USE_SECURITY_VALUE_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class SecurityValueApiService {
  private readonly api = inject(ApiService);

  getSecurityValues(): Observable<SecurityValueApiRecord[]> {
    if (USE_SECURITY_VALUE_EXAMPLE_DATA) {
      return of([...SECURITY_VALUE_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<SecurityValueApiRecord[]>('api/security-values');
  }

  updateSecurityValuesBulk(
    request: SecurityValueBulkUpdateRequest,
  ): Observable<SecurityValueApiRecord[]> {
    if (USE_SECURITY_VALUE_EXAMPLE_DATA) {
      for (const update of request.loans) {
        const record = SECURITY_VALUE_EXAMPLE_DATA.find(
          (item) => String(item['LoanKey'] ?? '') === update.loanKey,
        );
        if (!record) {
          continue;
        }
        record['SecurityValue'] = update.securityValue;
        record['SecurityValueOverridden'] = update.securityValueOverridden;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...SECURITY_VALUE_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<SecurityValueApiRecord[]>('api/security-values/bulk', request);
  }
}
