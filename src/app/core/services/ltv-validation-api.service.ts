import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';
import { appendMortgageStatusParams } from '../utils/mortgage-status-query.util';

/** Row from GET /api/LtvValidation — leaf child loans with AI-extracted LTV. */
export type LtvValidationRowDto = {
  loanKey: number;
  loanCode?: string | null;
  loanName?: string | null;
  childLoanId?: string | null;
  description?: string | null;
  loanAliasName: string;
  investorAliasName?: string | null;
  securityValue?: number | null;
  exposure?: number | null;
  ranking?: number | null;
  priorLtv?: number | null;
  ltv?: number | null;
  updateReason?: string | null;
  updateComment?: string | null;
  aiConfidenceScore?: number | null;
  qrSlideLink?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type LtvValidationUpdatePayload = {
  loanKey: number;
  loanCode?: string | null;
  ltv: number | null;
  updateReason?: string | null;
  updateComment?: string | null;
  userUpdatedBy: string;
};

export type LtvValidationBulkUpdateRequest = {
  loans: LtvValidationUpdatePayload[];
};

export type LtvValidationConfirmRequest = {
  loanKeys: number[];
  userUpdatedBy: string;
};

@Injectable({
  providedIn: 'root',
})
export class LtvValidationApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/LtvValidation`;
  }

  getLoans(loanAliasIds: number[], statuses: string[]) {
    // Statuses first so long alias lists cannot push status params off truncated URLs.
    let params = appendMortgageStatusParams(new HttpParams(), statuses);
    for (const id of loanAliasIds) {
      if (id > 0) {
        params = params.append('loanAliasIds', String(id));
      }
    }
    return this.http.get<LtvValidationRowDto[] | Record<string, unknown>>(this.baseUrl, { params });
  }

  saveLtv(request: LtvValidationBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }

  confirmAiLtv(request: LtvValidationConfirmRequest) {
    return this.http.post<void>(`${this.baseUrl}/confirm`, request);
  }
}
