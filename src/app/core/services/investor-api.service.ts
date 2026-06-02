import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

export type InvestorDto = {
  investorKey: number;
  investorCode: string;
  investorName: string;
  investorAliasKey?: number | null;
  investorAliasName?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type InvestorUpdatePayload = {
  investorKey: number;
  investorAliasKey: number;
  userUpdatedBy: string;
};

export type InvestorBulkUpdateRequest = {
  investors: InvestorUpdatePayload[];
};

/** @deprecated Use InvestorDto */
export type InvestorAliasRow = {
  investor_key: number;
  investor_code: string;
  investor_name: string;
  investor_alias_name: string;
  user_updated_by: string | null;
  user_updated_date: string | null;
};

/** @deprecated Use InvestorBulkUpdateRequest */
export type InvestorAliasBulkUpdateRequest = InvestorBulkUpdateRequest;

/** Single strong type used for display, create, and update of Investor Aliases. */
export type InvestorAlias = {
  investorAliasKey?: number;
  investorAliasId?: number;
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
    return `${this.apiConfig.baseUrl}/api/Investors`;
  }

  private get investorAliasUrl(): string {
    return `${this.apiConfig.baseUrl}/api/InvestorAlias`;
  }

  getInvestors() {
    return this.http.get<InvestorDto[]>(this.investorsUrl);
  }

  updateInvestorAliasesBulk(request: InvestorBulkUpdateRequest) {
    const url = `${this.investorsUrl}`;
    return this.http.put<void>(url, request);
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
