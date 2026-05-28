import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

/** Mirrors LoanAliasDto — used for display and as the base type throughout the component. */
export type LoanAlias = {
  loanAliasId: number;
  loanAliasName: string;
  collateralValue: number | null;
  securityValue: number | null;
  createdBy: string;
  createdDtm: string | null;
  updatedBy: string;
  updatedDtm: string | null;
};

/** Mirrors LoanAliasSaveRequest / LoanAliasUpdateRequest — used for both create and update calls. */
export type LoanAliasSaveRequest = {
  loanAliasName: string;
  securityValue: number | null;
  createdBy: string;
  updatedBy: string;
};

@Injectable({
  providedIn: 'root',
})
export class LoanAliasApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/LoanAlias`;
  }

  getAll() {
    return this.http.get<LoanAlias[]>(this.baseUrl);
  }

  create(payload: LoanAliasSaveRequest) {
    return this.http.post<LoanAlias>(this.baseUrl, payload);
  }

  update(loanAliasId: number, payload: LoanAliasSaveRequest) {
    return this.http.put<LoanAlias>(`${this.baseUrl}/${loanAliasId}`, payload);
  }

  delete(loanAliasId: number) {
    return this.http.delete<void>(`${this.baseUrl}/${loanAliasId}`);
  }
}
