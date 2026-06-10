import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

/** Row from GET /api/LtvValidation — leaf child loans with AI-extracted LTV. */
export type LtvValidationRowDto = {
  loanKey: number;
  parentLoanId?: string | null;
  childLoanId?: string | null;
  loanId?: string | null;
  description: string;
  loanAliasName: string;
  investorAliasName?: string | null;
  securityValue?: number | null;
  exposure?: number | null;
  ranking?: number | null;
  ltv?: number | null;
  aiCommentary?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type LtvValidationUpdatePayload = {
  loanKey: number;
  ltv: number | null;
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
    let params = new HttpParams();
    for (const id of loanAliasIds) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of statuses) {
      if (status.trim()) {
        params = params.append('statuses', status.trim());
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
