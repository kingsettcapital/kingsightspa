import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from './api.service';

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

export type NonKsServicedLoanPayload = Omit<
  NonKsServicedLoanDto,
  'nonKsServicedLoanKey' | 'userUpdatedDate'
> & {
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
  private readonly api = inject(ApiService);

  getAll(): Observable<NonKsServicedLoanDto[] | Record<string, unknown>> {
    return this.api.get<NonKsServicedLoanDto[] | Record<string, unknown>>(
      'api/NonKsServicedLoans',
    );
  }

  createLoans(request: NonKsServicedLoanBulkCreateRequest): Observable<void> {
    return this.api.post<void>('api/NonKsServicedLoans', request);
  }

  updateLoans(request: NonKsServicedLoanBulkUpdateRequest): Observable<void> {
    return this.api.put<void>('api/NonKsServicedLoans', request);
  }
}
