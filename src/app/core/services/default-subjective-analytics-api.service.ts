import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA } from '../constants/default-subjective-analytics-example.data';
import {
  DefaultSubjectiveAnalyticsApiRecord,
  DefaultSubjectiveAnalyticsBulkUpdateRequest,
} from '../interfaces/default-subjective-analytics.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live default-subjective-analytics API is ready. */
const USE_DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class DefaultSubjectiveAnalyticsApiService {
  private readonly api = inject(ApiService);

  getDefaultSubjectiveAnalytics(): Observable<DefaultSubjectiveAnalyticsApiRecord[]> {
    if (USE_DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA) {
      return of([...DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<DefaultSubjectiveAnalyticsApiRecord[]>('api/default-subjective-analytics');
  }

  updateDefaultSubjectiveAnalyticsBulk(
    request: DefaultSubjectiveAnalyticsBulkUpdateRequest,
  ): Observable<DefaultSubjectiveAnalyticsApiRecord[]> {
    if (USE_DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA) {
      for (const update of request.loans) {
        const record = DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA.find(
          (item) => String(item['LoanKey'] ?? '') === update.loanKey,
        );
        if (!record) {
          continue;
        }
        record['DefaultStatus'] = update.defaultStatus;
        record['ExitPlan'] = update.exitPlan;
        record['ExitDate'] = update.exitDate;
        record['MaturityAdditionalDetail'] = update.maturityAdditionalDetail;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<DefaultSubjectiveAnalyticsApiRecord[]>(
      'api/default-subjective-analytics/bulk',
      request,
    );
  }
}
