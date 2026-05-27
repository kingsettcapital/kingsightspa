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

/** Single strong type used for display, create, and update of Investor Aliases. */
export type InvestorAlias = {
  investorAliasId: number;
  investorAliasName: string;
  createdBy: string;
  createdDtm: string;
  updatedBy: string;
  updatedDtm: string;
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

  private get investorAliasUrl(): string {
    return `${this.apiConfig.baseUrl}/api/InvestorAlias`;
  }

  getInvestors() {
    return this.http.get<InvestorAliasRow[]>(this.investorsUrl);
  }

  updateInvestorAliasesBulk(request: InvestorAliasBulkUpdateRequest) {
    const url = `${this.investorsUrl}/aliases`;
    return this.http.put<InvestorAliasBulkUpdateRequest>(url, request);
  }

  // ── InvestorAlias CRUD ──────────────────────────────────────────────────────

  getAllAliases() {
    return this.http.get<InvestorAlias[]>(this.investorAliasUrl);
  }

  createAlias(payload: InvestorAlias) {
    return this.http.post<InvestorAlias>(this.investorAliasUrl, payload);
  }

  updateAlias(payload: InvestorAlias) {
    return this.http.put<InvestorAlias>(
      `${this.investorAliasUrl}/${payload.investorAliasId}`,
      payload,
    );
  }

  deleteAlias(investorAliasId: number) {
    return this.http.delete<void>(`${this.investorAliasUrl}/${investorAliasId}`);
  }
}
