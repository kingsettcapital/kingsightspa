import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

/** GET /api/ManagementSummary — one row per loan alias (9 display fields). */
export type ManagementSummaryRowDto = {
  loanAliasKey: number;
  loanAliasName: string;
  ranking: number | null;
  investorAliasName: string;
  loanCount: number;
  totalExposure: number | null;
  securityValue: number | null;
  avgLtv: number | null;
  defaultStatus: string | null;
  defaultDate: string | null;
};

/** GET /api/ManagementSummary/{loanAliasKey}/loan-details — child loan rows (7 display fields). */
export type LoanDetailReportRowDto = {
  loanKey: number;
  parentLoanId: string;
  childLoanId: string;
  description: string;
  investorAliasName: string;
  securityValue: number | null;
  exposure: number | null;
  ltv: number | null;
};

export type ManagementSummaryQuery = {
  loanAliasIds?: number[];
  statuses?: string[];
};

@Injectable({
  providedIn: 'root',
})
export class ManagementSummaryApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/ManagementSummary`;
  }

  getSummary(query: ManagementSummaryQuery = {}) {
    return this.http.get<ManagementSummaryRowDto[]>(this.baseUrl, {
      params: this.buildListParams(query),
    });
  }

  getLoanDetails(loanAliasKey: number, query: ManagementSummaryQuery = {}) {
    return this.http.get<LoanDetailReportRowDto[]>(
      `${this.baseUrl}/${encodeURIComponent(String(loanAliasKey))}/loan-details`,
      { params: this.buildListParams(query) },
    );
  }

  private buildListParams(query: ManagementSummaryQuery): HttpParams {
    let params = new HttpParams();
    for (const id of query.loanAliasIds ?? []) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of query.statuses ?? []) {
      params = params.append('statuses', status);
    }
    return params;
  }
}
