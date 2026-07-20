import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';
import { appendMortgageStatusParams } from '../utils/mortgage-status-query.util';

/** Row from GET /api/DefaultDateCapture — loan_alias_relationship. */
export type DefaultDateCaptureRowDto = {
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
  loanTermDefaultDate?: string | null;
  defaultDate?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type DefaultDateCaptureUpdatePayload = {
  loanKey: number;
  loanCode: string;
  defaultDate: string | null;
  userUpdatedBy: string;
};

export type DefaultDateCaptureBulkUpdateRequest = {
  loans: DefaultDateCaptureUpdatePayload[];
};

@Injectable({
  providedIn: 'root',
})
export class DefaultDateCaptureApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/DefaultDateCapture`;
  }

  getLoans(statuses: string[]) {
    let params = appendMortgageStatusParams(new HttpParams(), statuses);
    return this.http.get<DefaultDateCaptureRowDto[]>(this.baseUrl, { params });
  }

  saveDefaultDates(request: DefaultDateCaptureBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
