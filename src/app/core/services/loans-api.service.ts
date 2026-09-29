import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';

import { APP_API_CONFIG } from '../constants/api.config';
import { LoansApiCallOptions } from '../interfaces/loans-api.interfaces';
import { LoanTableQuery, LoanTableResult } from '../interfaces/loan-table.interfaces';
import { mapApiLoanToRow } from '../utils/loan-ranking.mapper';
import { queryLoanRankingRows, queryLoansExampleData } from './loans-table-query.util';

/** Mirrors GET /api/Loans — aligned with InvestorDto (loanDesc ↔ investorName). */
export type LoanDto = {
  loanKey: number;
  loanCode: string;
  loanDesc?: string | null;
  loanAliasKey?: number | null;
  loanAliasName?: string | null;
  investorName?: string | null;
  investorAliasName?: string | null;
  loanRanking?: number | null;
  dummyLoanLink?: string | null;
  isLoanInterestApplicable?: boolean | null;
  lateInterestOffNote?: string | null;
  fundingStatusKey?: number | null;
  fundingStatusName?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
  isNonKs?: boolean | null;
};

export type LoanAttributeUpdatePayload = {
  loanKey: number;
  loanCode: string;
  loanAliasKey: number;
  loanRanking?: number | null;
  dummyLoanLink?: string | null;
  isLoanInterestApplicable?: boolean | null;
  lateInterestOffNote?: string | null;
  fundingStatusKey?: number | null;
  userUpdatedBy: string;
};

export type LoanBulkUpdateRequest = {
  loans: LoanAttributeUpdatePayload[];
  /** Screen audit columns: loan_alias | loan_attribute */
  auditProfile?: 'loan_alias' | 'loan_attribute';
};

/** From GET /api/Loans/lookups — loan_alias_master dropdown options. */
export type LoanAliasOptionDto = {
  loanAliasId: number;
  loanAliasName: string;
};

export type LoanLookupsDto = {
  loanAliases: LoanAliasOptionDto[];
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

  getLoans(
    auditProfile: 'loan_alias' | 'loan_attribute' = 'loan_alias',
    statuses: string[] = [],
  ) {
    const params: Record<string, string | string[]> = { auditProfile };
    if (statuses.length > 0) {
      params['statuses'] = statuses;
    }
    return this.http.get<LoanDto[]>(this.loansUrl, { params });
  }

  getLookups() {
    return this.http.get<LoanLookupsDto>(`${this.loansUrl}/lookups`);
  }

  getLoansTable(query: LoanTableQuery, options: LoansApiCallOptions = {}): Observable<LoanTableResult> {
    if (options.useExampleData) {
      return of(queryLoansExampleData(query));
    }

    return this.getLoans('loan_attribute').pipe(
      map((loans) => {
        const rows = loans.map((loan, index) =>
          mapApiLoanToRow(
            {
              loanKey: loan.loanKey,
              LoanKey: loan.loanKey,
              loanCode: loan.loanCode,
              LoanCode: loan.loanCode,
              loanDesc: loan.loanDesc,
              LoanDesc: loan.loanDesc,
              loanAliasName: loan.loanAliasName,
              LoanAliasName: loan.loanAliasName,
              investorName: loan.investorName,
              InvestorName: loan.investorName,
              investorAliasName: loan.investorAliasName,
              InvestorAliasName: loan.investorAliasName,
              loanRanking: loan.loanRanking,
              LoanRanking: loan.loanRanking,
              dummyLoanLink: loan.dummyLoanLink,
              DummyLoanLink: loan.dummyLoanLink,
              isLoanInterestApplicable: loan.isLoanInterestApplicable,
              IsLoanInterestApplicable: loan.isLoanInterestApplicable,
              lateInterestOffNote: loan.lateInterestOffNote,
              LateInterestOffNote: loan.lateInterestOffNote,
              userUpdatedBy: loan.userUpdatedBy,
              UserUpdatedBy: loan.userUpdatedBy,
              userUpdatedDate: loan.userUpdatedDate,
              UserUpdatedDate: loan.userUpdatedDate,
            },
            index,
          ),
        );
        return queryLoanRankingRows(rows, query);
      }),
    );
  }

  updateLoanAttributesBulk(request: LoanBulkUpdateRequest) {
    return this.http.put<void>(this.loansUrl, {
      loans: request.loans,
      auditProfile: request.auditProfile ?? 'loan_attribute',
    });
  }

  updateLoanAliasesBulk(request: LoanBulkUpdateRequest) {
    return this.http.put<void>(this.loansUrl, {
      loans: request.loans,
      auditProfile: request.auditProfile ?? 'loan_alias',
    });
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
