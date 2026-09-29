import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';
import { appendMortgageStatusParams } from '../utils/mortgage-status-query.util';

/** Row from GET /api/OtherCostCapture — maps loan_alias_relationship. */
export type OtherCostCaptureRowDto = {
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
  outstandingInvoices: number | null;
  estRealizationCosts: number | null;
  costToComplete: number | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type OtherCostCaptureUpdatePayload = {
  loanKey: number;
  loanCode: string;
  outstandingInvoices: number | null;
  estRealizationCosts: number | null;
  costToComplete: number | null;
  userUpdatedBy: string;
};

export type OtherCostCaptureBulkUpdateRequest = {
  loans: OtherCostCaptureUpdatePayload[];
};

@Injectable({
  providedIn: 'root',
})
export class OtherCostCaptureApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/OtherCostCapture`;
  }

  getLoans(statuses: string[], loanAliasId?: number | null) {
    let params = new HttpParams();
    if (loanAliasId != null && loanAliasId > 0) {
      params = params.set('loanAliasId', String(loanAliasId));
    }
    params = appendMortgageStatusParams(params, statuses);
    return this.http.get<OtherCostCaptureRowDto[]>(this.baseUrl, { params });
  }

  saveCosts(request: OtherCostCaptureBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
