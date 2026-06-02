import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

/** Mirrors GET /api/Loans — aligned with InvestorDto (loanDesc ↔ investorName). */
export type LoanDto = {
  loanKey: number;
  loanCode: string;
  loanDesc?: string | null;
  loanAliasKey?: number | null;
  loanAliasName?: string | null;
  investorName?: string | null;
  loanRanking?: number | null;
  dummyLoanLink?: string | null;
  isLoanInterestApplicable?: boolean | null;
  lateInterestOffNote?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type LoanUpdatePayload = {
  loanKey: number;
  loanAliasKey: number;
  userUpdatedBy: string;
};

export type LoanBulkUpdateRequest = {
  loans: LoanUpdatePayload[];
};

/** @deprecated Prefer LoanDto for typed loan responses. */
export type LoanApiRecord = Record<string, string | number | boolean | null | undefined>;

@Injectable({
  providedIn: 'root',
})
export class LoansApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get loansUrl(): string {
    return `${this.apiConfig.baseUrl}/api/Loans`;
  }

  getLoans() {
    return this.http.get<LoanDto[]>(this.loansUrl);
  }

  updateLoanAliasesBulk(request: LoanBulkUpdateRequest) {
    return this.http.put<void>(this.loansUrl, request);
  }

  /** @deprecated API has no per-loan PUT; use updateLoanAliasesBulk. */
  updateLoan(loanKey: string | number, payload: LoanApiRecord) {
    return this.http.put<void>(
      `${this.loansUrl}/${encodeURIComponent(String(loanKey))}`,
      payload,
    );
  }

  createLoan(payload: LoanApiRecord) {
    return this.http.post<LoanApiRecord>(this.loansUrl, payload);
  }

  deleteLoan(loanId: string | number) {
    return this.http.delete<void>(`${this.loansUrl}/${loanId}`);
  }
}
