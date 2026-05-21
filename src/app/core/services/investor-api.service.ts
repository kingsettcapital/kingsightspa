import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

export type InvestorAliasRow = {
  investor_key: number;
  investor_code: string;
  investor_name: string;
  investor_alias_name: string;
  user_updated_by: string | null;
  user_updated_date: string | null;
};

export type InvestorAliasUpdatePayload = {
  investor_key: number;
  investor_alias_name: string;
  user_updated_date: string | null;
  user_updated_by: string | null;
};

export type InvestorAliasBulkUpdateRequest = {
  Investors: InvestorAliasUpdatePayload[];
};


@Injectable({
  providedIn: 'root',
})
export class InvestorApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get investorsUrl(): string {
    return `${this.apiConfig.baseUrl}/api/Investor`;
  }

  getInvestors() {
    return this.http.get<InvestorAliasRow[]>(this.investorsUrl);
  }

  /**
   * Updates all changed investor aliases in one request.
   * Body: array of per-row payloads (same shape as the former single-row PUT /api/Investor/{key}/alias).
   */
  updateInvestorAliasesBulk(request: InvestorAliasBulkUpdateRequest) {
    const url = `${this.investorsUrl}/aliases`;
    return this.http.put<InvestorAliasBulkUpdateRequest>(url, request);
  }
}
