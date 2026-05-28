import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';

import { LOANS_RANKING_EXAMPLE_DATA } from '../constants/loans-ranking-example.data';
import {
  LoansApiCallOptions,
  LoansPagedApiResponse,
} from '../interfaces/loans-api.interfaces';
import { LoanApiRecord } from '../interfaces/loan.interfaces';
import {
  AssignLoansToAliasPayload,
  LoanTableQuery,
  LoanTableResult,
  UnassignedLoanOption,
} from '../interfaces/loan-table.interfaces';
import { mapApiLoanToRow } from '../utils/loan-ranking.mapper';
import { isUnassignedLoanAlias } from '../utils/loan-alias.util';
import { ApiService } from './api.service';
import {
  applyClientTableTransforms,
  buildLoansApiQueryParams,
  mapLoansPagedResponse,
  resolveServerFiltersFromQuery,
} from './loans-api-query.util';
import { queryLoansExampleData } from './loans-table-query.util';

/** Default when a call does not pass `useExampleData` (e.g. Loan Alias page). */
const USE_LOANS_EXAMPLE_DATA_DEFAULT = false;

@Injectable({
  providedIn: 'root',
})
export class LoansApiService {
  private readonly api = inject(ApiService);

  getLoansTable(query: LoanTableQuery, options?: LoansApiCallOptions): Observable<LoanTableResult> {
    if (this.useExampleData(options)) {
      return of(queryLoansExampleData(query)).pipe(delay(400));
    }

    const resolvedQuery = resolveServerFiltersFromQuery(query);
    const params = buildLoansApiQueryParams(resolvedQuery);

    return this.api.get<LoansPagedApiResponse>('api/Loans', params).pipe(
      map((response) => {
        const mapped = mapLoansPagedResponse(response);
        return {
          ...mapped,
          rows: applyClientTableTransforms(mapped.rows, query),
        };
      }),
    );
  }

  getLoans(options?: LoansApiCallOptions): Observable<LoanApiRecord[]> {
    if (this.useExampleData(options)) {
      return of([...LOANS_RANKING_EXAMPLE_DATA]).pipe(delay(600));
    }
    return this.api
      .get<LoansPagedApiResponse>('api/Loans', { page: 1, pageSize: 500 })
      .pipe(map((response) => response.items ?? response.Items ?? []));
  }

  createLoan(payload: LoanApiRecord, options?: LoansApiCallOptions): Observable<LoanApiRecord> {
    if (this.useExampleData(options)) {
      return of({ ...payload }).pipe(delay(400));
    }
    return this.api.post<LoanApiRecord>('api/Loans', payload);
  }

  updateLoan(
    loanKey: string | number,
    payload: LoanApiRecord,
    options?: LoansApiCallOptions,
  ): Observable<LoanApiRecord> {
    if (this.useExampleData(options)) {
      return of({ loanKey: String(loanKey), ...payload }).pipe(delay(400));
    }
    return this.api.put<LoanApiRecord>(
      `api/Loans/${encodeURIComponent(String(loanKey))}`,
      payload,
    );
  }

  deleteLoan(loanId: string | number) {
    return this.api.delete<void>(`api/Loans/${loanId}`);
  }

  createLoanAlias(
    aliasName: string,
    options?: LoansApiCallOptions,
  ): Observable<{ aliasName: string }> {
    const trimmed = aliasName.trim();
    if (this.useExampleData(options)) {
      return of({ aliasName: trimmed }).pipe(delay(300));
    }
    return this.api.post<{ aliasName: string }>('api/LoanAliases', { aliasName: trimmed });
  }

  getUnassignedLoans(options?: LoansApiCallOptions): Observable<UnassignedLoanOption[]> {
    if (this.useExampleData(options)) {
      const unassigned = LOANS_RANKING_EXAMPLE_DATA.map((record, index) =>
        mapApiLoanToRow(record, index),
      )
        .filter((row) => isUnassignedLoanAlias(row.loanAlias))
        .map((row) => ({
          loanKey: row.loanKey,
          loanId: row.loanId,
          loanDescription: row.loanDescription,
        }));
      return of(unassigned).pipe(delay(400));
    }

    return this.getLoansTable(
      { page: 1, pageSize: 500, sorting: [{ id: 'loanDescription', desc: false }] },
      options,
    ).pipe(
      map((result) =>
        result.rows
          .filter((row) => isUnassignedLoanAlias(row.loanAlias))
          .map((row) => ({
            loanKey: row.loanKey,
            loanId: row.loanId,
            loanDescription: row.loanDescription,
          })),
      ),
    );
  }

  assignLoansToAlias(
    payload: AssignLoansToAliasPayload,
    options?: LoansApiCallOptions,
  ): Observable<void> {
    if (this.useExampleData(options)) {
      for (const loanKey of payload.loanKeys) {
        const record = LOANS_RANKING_EXAMPLE_DATA.find(
          (item) => String(item['LoanKey'] ?? '') === loanKey,
        );
        if (!record) {
          continue;
        }
        record['LoanAliasName'] = payload.aliasName;
        const existingOptions = String(record['LoanAliasOptions'] ?? '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (!existingOptions.includes(payload.aliasName)) {
          record['LoanAliasOptions'] = [...existingOptions, payload.aliasName].join(',');
        }
      }
      return of(undefined).pipe(delay(400));
    }
    return this.api.post<void>('api/LoanAliases/assign', payload);
  }

  private useExampleData(options?: LoansApiCallOptions): boolean {
    return options?.useExampleData ?? USE_LOANS_EXAMPLE_DATA_DEFAULT;
  }
}
