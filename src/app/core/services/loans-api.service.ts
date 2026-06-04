import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of } from 'rxjs';

import { LOANS_RANKING_EXAMPLE_DATA } from '../constants/loans-ranking-example.data';
import {
  LoansApiCallOptions,
  LoansPagedApiResponse,
} from '../interfaces/loans-api.interfaces';
import {
  LoanApiRecord,
  LoanBulkUpdateRequest,
  LoanDto,
} from '../interfaces/loan.interfaces';
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

  /** Typed loan list for Loan Alias Assignment and similar screens. */
  getLoanDtos(options?: LoansApiCallOptions): Observable<LoanDto[]> {
    return this.getLoans(options).pipe(map((records) => records.map((r) => this.mapToLoanDto(r))));
  }

  updateLoanAliasesBulk(
    request: LoanBulkUpdateRequest,
    options?: LoansApiCallOptions,
  ): Observable<void> {
    if (this.useExampleData(options)) {
      for (const update of request.loans) {
        const record = LOANS_RANKING_EXAMPLE_DATA.find(
          (item) => Number(item['LoanKey'] ?? item['loanKey'] ?? 0) === update.loanKey,
        );
        if (!record) {
          continue;
        }
        record['LoanAliasKey'] = update.loanAliasKey;
        record['loanAliasKey'] = update.loanAliasKey;
        record['userUpdatedBy'] = update.userUpdatedBy;
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of(undefined).pipe(delay(400));
    }
    return this.api.put<void>('api/Loans', request);
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

  private readBoolean(record: LoanApiRecord, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = record[key];
      if (value === undefined || value === null) {
        continue;
      }
      if (typeof value === 'boolean') {
        return value;
      }
      if (value === 'true' || value === '1' || value === 1) {
        return true;
      }
      if (value === 'false' || value === '0' || value === 0) {
        return false;
      }
    }
    return null;
  }

  private mapToLoanDto(record: LoanApiRecord): LoanDto {
    const read = (keys: string[]): string | number | null => {
      for (const key of keys) {
        const value = record[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return value as string | number;
        }
      }
      return null;
    };

    const loanKey = Number(read(['LoanKey', 'loanKey']) ?? 0);
    return {
      loanKey,
      loanCode: String(read(['LoanCode', 'loanCode']) ?? ''),
      loanDesc: read(['LoanDesc', 'loanDesc']) as string | null,
      loanAliasKey: read(['LoanAliasKey', 'loanAliasKey']) as number | null,
      loanAliasName: read(['LoanAliasName', 'loanAliasName']) as string | null,
      investorName: read(['InvestorName', 'investorName']) as string | null,
      loanRanking: read(['LoanRanking', 'loanRanking']) as number | null,
      dummyLoanLink: read(['DummyLoanLink', 'dummyLoanLink']) as string | null,
      isLoanInterestApplicable: this.readBoolean(record, [
        'IsLoanInterestApplicable',
        'isLoanInterestApplicable',
      ]),
      lateInterestOffNote: read(['LateInterestOffNote', 'lateInterestOffNote']) as string | null,
      userUpdatedBy: read(['UserUpdatedBy', 'userUpdatedBy']) as string | null,
      userUpdatedDate: read(['UserUpdatedDate', 'userUpdatedDate']) as string | null,
    };
  }

  private useExampleData(options?: LoansApiCallOptions): boolean {
    return options?.useExampleData ?? USE_LOANS_EXAMPLE_DATA_DEFAULT;
  }
}
