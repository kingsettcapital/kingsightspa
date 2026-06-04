import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

/** Mirrors LoanSecurityValueDto from GET /api/LoanSecurityValue */
export type LoanSecurityValueDto = {
  loanAliasId?: number;
  loanAliasKey?: number;
  loanAliasName: string;
  collateralPerYardi?: number | null;
  collateralValue?: number | null;
  securityValue: number | null;
  units: number | null;
  squareFeet: number | null;
  acres: number | null;
  updatedBy?: string | null;
  updatedDtm?: string | null;
  /** @deprecated Prefer updatedBy / updatedDtm from API */
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type LoanSecurityValueUpdatePayload = {
  loanAliasId: number;
  securityValue: number | null;
  units: number | null;
  squareFeet: number | null;
  acres: number | null;
  updatedBy: string;
};

export type LoanSecurityValueBulkUpdateRequest = {
  loanSecurityValues: LoanSecurityValueUpdatePayload[];
};

/** Option from GET /api/LoanSecurityValue/statuses (value sent as statuses query param). */
export type LoanStatusFilterOption = {
  value: string;
  displayLabel: string;
};

@Injectable({
  providedIn: 'root',
})
export class LoanSecurityValueApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/LoanSecurityValue`;
  }

  getStatuses() {
    return this.http.get<LoanStatusFilterOption[]>(`${this.baseUrl}/statuses`);
  }

  getSecurityValues(loanAliasIds: number[], statuses: string[]) {
    let params = new HttpParams();
    for (const id of loanAliasIds) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of statuses) {
      if (status.trim()) {
        params = params.append('statuses', status.trim());
      }
    }
    return this.http.get<LoanSecurityValueDto[]>(this.baseUrl, { params });
  }

  saveSecurityValues(request: LoanSecurityValueBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
