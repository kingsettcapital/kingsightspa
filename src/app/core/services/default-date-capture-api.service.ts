import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

/** Row from GET /api/DefaultDateCapture — mort.dim_loan (leaf, current). */
export type DefaultDateCaptureRowDto = {
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
  loanTermDefaultDate?: string | null;
  defaultDate?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type DefaultDateCaptureUpdatePayload = {
  loanKey: number;
  defaultDate: string | null;
  userUpdatedBy: string;
};

export type DefaultDateCaptureBulkUpdateRequest = {
  loans: DefaultDateCaptureUpdatePayload[];
};

@Injectable({
  providedIn: 'root',
})
export class DefaultDateCaptureApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/DefaultDateCapture`;
  }

  getLoans(loanAliasIds: number[], statuses: string[]) {
    let params = new HttpParams();
    for (const id of loanAliasIds) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of statuses) {
      if (status.trim()) {
        params = params.append('statuses', status.trim());
      }
    }
    return this.http.get<DefaultDateCaptureRowDto[]>(this.baseUrl, { params });
  }

  saveDefaultDates(request: DefaultDateCaptureBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
