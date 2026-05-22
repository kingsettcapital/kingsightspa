import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';

import { LOANS_RANKING_EXAMPLE_DATA } from '../constants/loans-ranking-example.data';
import { LoansPagedApiResponse } from '../interfaces/loans-api.interfaces';
import { LoanApiRecord } from '../interfaces/loan.interfaces';
import { LoanTableQuery, LoanTableResult } from '../interfaces/loan-table.interfaces';
import { ApiService } from './api.service';
import {
  applyClientTableTransforms,
  buildLoansApiQueryParams,
  mapLoansPagedResponse,
  resolveServerFiltersFromQuery,
} from './loans-api-query.util';
import { queryLoansExampleData } from './loans-table-query.util';

/** Set to true to use local mock data instead of GET /api/Loans. */
const USE_LOANS_EXAMPLE_DATA = false;

@Injectable({
  providedIn: 'root',
})
export class LoansApiService {
  private readonly api = inject(ApiService);

  getLoansTable(query: LoanTableQuery): Observable<LoanTableResult> {
    if (USE_LOANS_EXAMPLE_DATA) {
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

  getLoans(): Observable<LoanApiRecord[]> {
    if (USE_LOANS_EXAMPLE_DATA) {
      return of([...LOANS_RANKING_EXAMPLE_DATA]).pipe(delay(600));
    }
    return this.api
      .get<LoansPagedApiResponse>('api/Loans', { page: 1, pageSize: 500 })
      .pipe(map((response) => response.items ?? response.Items ?? []));
  }

  createLoan(payload: LoanApiRecord): Observable<LoanApiRecord> {
    if (USE_LOANS_EXAMPLE_DATA) {
      return of({ ...payload }).pipe(delay(400));
    }
    return this.api.post<LoanApiRecord>('api/Loans', payload);
  }

  updateLoan(loanKey: string | number, payload: LoanApiRecord): Observable<LoanApiRecord> {
    if (USE_LOANS_EXAMPLE_DATA) {
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
}
