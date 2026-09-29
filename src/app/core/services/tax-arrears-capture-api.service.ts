import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';
import { appendMortgageStatusParams } from '../utils/mortgage-status-query.util';

/** Row from GET /api/TaxArrears — loan_tax_details joined to loan_alias_relationship. */
export type TaxArrearsCaptureRowDto = {
  taxArrearKey?: number;
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
  taxMemoDate?: string | null;
  taxArrears?: number | null;
  taxYear?: number | string | null;
  notes?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
};

export type TaxArrearsCaptureLookupsDto = {
  taxYears?: (number | string)[];
};

export type TaxArrearsCaptureUpdatePayload = {
  taxArrearKey: number;
  loanCode: string;
  originalTaxYear: string | null;
  originalTaxMemoDate: string | null;
  originalNotes: string | null;
  taxMemoDate: string | null;
  taxArrears: number | null;
  taxYear: string | null;
  notes: string | null;
  userUpdatedBy: string;
};

export type TaxArrearsCaptureBulkUpdateRequest = {
  taxArrears: TaxArrearsCaptureUpdatePayload[];
};

export type TaxArrearsCaptureCreateRequest = {
  loanKey?: number;
  loanCode?: string;
  taxMemoDate: string | null;
  taxArrears: number | null;
  taxYear: string | null;
  notes: string | null;
  userUpdatedBy: string;
};

@Injectable({
  providedIn: 'root',
})
export class TaxArrearsCaptureApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/TaxArrears`;
  }

  getRecords(statuses: string[]) {
    const params = appendMortgageStatusParams(new HttpParams(), statuses);
    return this.http.get<TaxArrearsCaptureRowDto[]>(this.baseUrl, { params });
  }

  getLookups() {
    return this.http.get<TaxArrearsCaptureLookupsDto>(`${this.baseUrl}/lookups`);
  }

  createRecord(request: TaxArrearsCaptureCreateRequest) {
    return this.http.post<void>(this.baseUrl, request);
  }

  saveRecords(request: TaxArrearsCaptureBulkUpdateRequest) {
    return this.http.put<void>(this.baseUrl, request);
  }
}
