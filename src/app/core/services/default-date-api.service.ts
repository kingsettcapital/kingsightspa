import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { DEFAULT_DATE_EXAMPLE_DATA } from '../constants/default-date-example.data';
import {
  DefaultDateApiRecord,
  DefaultDateBulkUpdateRequest,
} from '../interfaces/default-date.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live default-date API is ready. */
const USE_DEFAULT_DATE_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class DefaultDateApiService {
  private readonly api = inject(ApiService);

  getDefaultDates(): Observable<DefaultDateApiRecord[]> {
    if (USE_DEFAULT_DATE_EXAMPLE_DATA) {
      return of([...DEFAULT_DATE_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<DefaultDateApiRecord[]>('api/default-dates');
  }

  updateDefaultDatesBulk(request: DefaultDateBulkUpdateRequest): Observable<DefaultDateApiRecord[]> {
    if (USE_DEFAULT_DATE_EXAMPLE_DATA) {
      for (const update of request.loans) {
        const record = DEFAULT_DATE_EXAMPLE_DATA.find(
          (item) => String(item['LoanKey'] ?? '') === update.loanKey,
        );
        if (!record) {
          continue;
        }
        record['DefaultDate'] = update.defaultDate;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...DEFAULT_DATE_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<DefaultDateApiRecord[]>('api/default-dates/bulk', request);
  }
}
