import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { APP_API_CONFIG } from '../constants/api.config';
import { DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA } from '../constants/default-subjective-analytics-example.data';
import {
  DefaultSubjectiveAnalyticsApiRecord,
  DefaultSubjectiveAnalyticsBulkUpdateRequest as FeatureBulkUpdateRequest,
} from '../interfaces/default-subjective-analytics.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live default-subjective-analytics API is ready. */
const USE_DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA = true;

/** Row from GET /api/DefaultSubjectiveAnalytics — mort.dim_loan (leaf, current). */
export type DefaultSubjectiveAnalyticsRowDto = {
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
  maturityDate?: string | null;
  defaultStatus?: string | null;
  exitPlan?: string | null;
  exitDate?: string | null;
  maturityAdditionalDetail?: string | null;
  /** Alternate names returned by some API builds */
  defaultSubjectiveStatus?: string | null;
  subjectiveExitPlan?: string | null;
  subjectiveExitDate?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type DefaultSubjectiveAnalyticsUpdatePayload = {
  loanKey: number;
  defaultStatus: string | null;
  exitPlan: string | null;
  exitDate: string | null;
  maturityAdditionalDetail: string | null;
  userUpdatedBy: string;
};

export type DefaultSubjectiveAnalyticsBulkUpdateRequest = {
  loans: DefaultSubjectiveAnalyticsUpdatePayload[];
};

/** From GET /api/DefaultSubjectiveAnalytics/lookups */
export type DefaultSubjectiveAnalyticsLookupsDto = {
  defaultStatuses?: string[];
  exitPlans?: string[];
  defaultStatusOptions?: { value: string; displayLabel?: string }[];
  exitPlanOptions?: { value: string; displayLabel?: string }[];
};

@Injectable({
  providedIn: 'root',
})
export class DefaultSubjectiveAnalyticsApiService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/DefaultSubjectiveAnalytics`;
  }

  getDefaultSubjectiveAnalytics(): Observable<DefaultSubjectiveAnalyticsApiRecord[]> {
    if (USE_DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA) {
      return of([...DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<DefaultSubjectiveAnalyticsApiRecord[]>('api/default-subjective-analytics');
  }

  updateDefaultSubjectiveAnalyticsBulk(
    request: FeatureBulkUpdateRequest,
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

  getLoans(loanAliasIds: number[], statuses: string[]) {
    let params = new HttpParams();
    for (const id of loanAliasIds) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of statuses) {
      if (status.trim()) {
        params = params.append('statuses', status.trim());
      }
    }
    return this.http.get<DefaultSubjectiveAnalyticsRowDto[] | Record<string, unknown>>(
      this.baseUrl,
      { params },
    );
  }

  getLookups() {
    return this.http.get<DefaultSubjectiveAnalyticsLookupsDto>(`${this.baseUrl}/lookups`);
  }

  saveLoans(request: DefaultSubjectiveAnalyticsBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
