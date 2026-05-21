import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../config/api.config';

export type LoanApiRecord = Record<string, string | number | null | undefined>;

@Injectable({
  providedIn: 'root',
})
export class LoansApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get loansUrl(): string {
    return `${this.apiConfig.baseUrl}/api/loans`;
  }

  getLoans() {
    return this.http.get<LoanApiRecord[]>(this.loansUrl);
  }

  createLoan(payload: LoanApiRecord) {
    return this.http.post<LoanApiRecord>(this.loansUrl, payload);
  }

  updateLoan(loanKey: string | number, payload: LoanApiRecord) {
    return this.http.put<LoanApiRecord>(`${this.loansUrl}/${encodeURIComponent(String(loanKey))}`, payload);
  }

  deleteLoan(loanId: string | number) {
    return this.http.delete<void>(`${this.loansUrl}/${loanId}`);
  }
}
