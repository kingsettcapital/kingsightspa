import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

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
  investorCode: string;
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

/** Row from GET /api/InvestorAlias — wh_gold1.subjective_input.investor_alias_master */
export type InvestorAlias = {
  investorAliasId: number;
  investorAliasName: string;
  createdBy: string;
  createdDtm: string | null;
  updatedBy: string;
  updatedDtm: string | null;
};

export type InvestorAliasCreateRequest = {
  investorAliasName: string;
  createdBy: string;
};

export type InvestorAliasUpdateRequest = {
  investorAliasName: string;
  updatedBy: string;
};

export type InvestorCreateRequest = {
  investorName: string;
  createdBy: string;
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

  createInvestor(payload: InvestorCreateRequest) {
    return this.http.post<InvestorDto>(this.investorsUrl, payload);
  }

  updateInvestorAliasesBulk(request: InvestorBulkUpdateRequest) {
    const url = `${this.investorsUrl}`;
    return this.http.put<void>(url, request);
  }

  // ── InvestorAlias CRUD ──────────────────────────────────────────────────────

  getAllAliases() {
    return this.http.get<InvestorAlias[]>(this.investorAliasUrl);
  }

  createAlias(payload: InvestorAliasCreateRequest) {
    return this.http.post<InvestorAlias>(this.investorAliasUrl, payload);
  }

  updateAlias(investorAliasId: number, payload: InvestorAliasUpdateRequest) {
    return this.http.put<InvestorAlias>(
      `${this.investorAliasUrl}/${investorAliasId}`,
      payload,
    );
  }
}
