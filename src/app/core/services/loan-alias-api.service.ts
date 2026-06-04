import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

/** Mirrors LoanAliasDto — used on Loan Alias CRUD and Security Value alias filter. */
export type LoanAlias = {
  loanAliasKey?: number;
  loanAliasId: number;
  loanAliasName: string;
  collateralValue?: number | null;
  securityValue?: number | null;
  createdBy: string;
  createdDtm: string | null;
  updatedBy: string;
  updatedDtm: string | null;
};

/** Mirrors LoanAliasSaveRequest — name-only create/update on Loan Alias CRUD page. */
export type LoanAliasSaveRequest = {
  loanAliasName: string;
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

  getAllAliases() {
    return this.getAll();
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
