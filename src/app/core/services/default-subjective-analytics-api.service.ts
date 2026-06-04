import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

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
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/DefaultSubjectiveAnalytics`;
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
