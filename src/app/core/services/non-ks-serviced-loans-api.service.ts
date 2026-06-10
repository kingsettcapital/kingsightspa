import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

/** Full manual-entry row for Non-KS serviced loans (quarterly subjective input). */
export type NonKsServicedLoanDto = {
  nonKsServicedLoanKey?: number;
  loanName?: string | null;
  asAtDate?: string | null;
  loanId?: string | null;
  servicerId?: string | null;
  description?: string | null;
  investor?: string | null;
  dateOfDefault?: string | null;
  maturityDate?: string | null;
  interestOffDate?: string | null;
  taxMemoDate?: string | null;
  securityValue?: number | null;
  units?: number | null;
  netAcres?: number | null;
  squareFeet?: number | null;
  interestRate?: number | null;
  principalBalance?: number | null;
  outstandingInterest?: number | null;
  accruedInterest?: number | null;
  lateInterest?: number | null;
  outstandingInvoices?: number | null;
  estRealizationCosts?: number | null;
  costToComplete?: number | null;
  taxArrears?: number | null;
  interestAsOfTaxMemo?: number | null;
  interestAdjustment?: number | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type NonKsServicedLoanPayload = Omit<NonKsServicedLoanDto, 'nonKsServicedLoanKey' | 'userUpdatedDate'> & {
  nonKsServicedLoanKey?: number;
  userUpdatedBy: string;
};

export type NonKsServicedLoanBulkCreateRequest = {
  loans: NonKsServicedLoanPayload[];
};

export type NonKsServicedLoanBulkUpdateRequest = {
  loans: NonKsServicedLoanPayload[];
};

@Injectable({
  providedIn: 'root',
})
export class NonKsServicedLoansApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/NonKsServicedLoans`;
  }

  getAll() {
    return this.http.get<NonKsServicedLoanDto[] | Record<string, unknown>>(this.baseUrl);
  }

  createLoans(request: NonKsServicedLoanBulkCreateRequest) {
    return this.http.post<void>(this.baseUrl, request);
  }

  updateLoans(request: NonKsServicedLoanBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
