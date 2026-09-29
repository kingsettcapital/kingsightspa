import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

/** Full manual-entry row for Non-KS serviced loans (quarterly subjective input). */
export type NonKsServicedLoanDto = {
  nonKsServicedLoanKey?: number | string | null;
  loanAliasName?: string | null;
  loanName?: string | null;
  asAtDate?: string | null;
  loanId?: string | null;
  loanCode?: string | null;
  extLoanCode?: string | null;
  servicerId?: string | null;
  description?: string | null;
  investorAliasName?: string | null;
  investor?: string | null;
  investorCode?: string | null;
  sponsor?: string | null;
  dateOfDefault?: string | null;
  maturityDate?: string | null;
  interestOffDate?: string | null;
  taxMemoDate?: string | null;
  securityValue?: number | null;
  units?: number | null;
  netAcres?: number | null;
  squareFeet?: number | null;
  interestRate?: number | null;
  currentLtv?: number | null;
  principalBalance?: number | null;
  outstandingInterest?: number | null;
  accruedInterest?: number | null;
  lateInterest?: number | null;
  outstandingInvoices?: number | null;
  estRealizationCosts?: number | null;
  costToComplete?: number | null;
  taxArrears?: number | null;
  interestAdjustment?: number | null;
  fundingStatus?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type NonKsServicedLoanPayload = Omit<
  NonKsServicedLoanDto,
  'nonKsServicedLoanKey' | 'userUpdatedDate'
> & {
  nonKsServicedLoanKey?: number | string | null;
  originalAsAtDate?: string | null;
  userUpdatedBy: string;
};

export type NonKsServicedLoanBulkCreateRequest = {
  loans: NonKsServicedLoanPayload[];
};

export type NonKsServicedLoanBulkUpdateRequest = {
  loans: NonKsServicedLoanPayload[];
};

export type NonKsServicedLoanLookupsDto = {
  nextExtLoanCode?: string;
  NextExtLoanCode?: string;
  sponsors?: string[];
  Sponsors?: string[];
};

@Injectable({
  providedIn: 'root',
})
export class NonKsServicedLoansApiService {
  private readonly api = inject(ApiService);

  getLookups(): Observable<NonKsServicedLoanLookupsDto> {
    return this.api.get<NonKsServicedLoanLookupsDto>('api/NonKsServicedLoans/lookups');
  }

  getAll(): Observable<NonKsServicedLoanDto[] | Record<string, unknown>> {
    return this.api.get<NonKsServicedLoanDto[] | Record<string, unknown>>(
      'api/NonKsServicedLoans',
    );
  }

  createLoans(request: NonKsServicedLoanBulkCreateRequest): Observable<NonKsServicedLoanDto[]> {
    return this.api.post<NonKsServicedLoanDto[]>('api/NonKsServicedLoans', request);
  }

  updateLoans(request: NonKsServicedLoanBulkUpdateRequest): Observable<NonKsServicedLoanDto[]> {
    return this.api.put<NonKsServicedLoanDto[]>('api/NonKsServicedLoans', request);
  }
}
