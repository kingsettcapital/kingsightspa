import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { INVESTOR_ALIAS_EXAMPLE_DATA } from '../constants/investor-alias-example.data';
import {
  InvestorAlias,
  InvestorAliasBulkUpdateRequest,
  InvestorAliasRow,
} from '../interfaces/investor.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live investor API is ready. */
const USE_INVESTOR_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class InvestorApiService {
  private readonly api = inject(ApiService);

  getInvestors(): Observable<InvestorAliasRow[]> {
    if (USE_INVESTOR_EXAMPLE_DATA) {
      return of([...INVESTOR_ALIAS_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<InvestorAliasRow[]>('api/Investor');
  }

  /**
   * Updates all changed investor aliases in one request.
   * Body: array of per-row payloads (same shape as the former single-row PUT /api/Investor/{key}/alias).
   */
  updateInvestorAliasesBulk(
    request: InvestorAliasBulkUpdateRequest,
  ): Observable<InvestorAliasBulkUpdateRequest> {
    if (USE_INVESTOR_EXAMPLE_DATA) {
      for (const update of request.Investors) {
        const record = INVESTOR_ALIAS_EXAMPLE_DATA.find(
          (item) => item.investor_key === update.investor_key,
        );
        if (!record) {
          continue;
        }
        record.investor_alias_name = update.investor_alias_name;
        record.user_updated_date = update.user_updated_date?.slice(0, 10) ?? null;
        record.user_updated_by = update.user_updated_by;
      }
      return of({ Investors: request.Investors }).pipe(delay(500));
    }
    return this.api.put<InvestorAliasBulkUpdateRequest>('api/Investor/aliases', request);
  }

  // ── InvestorAlias CRUD (`api/InvestorAlias`) ─────────────────────────────────

  getAllAliases(): Observable<InvestorAlias[]> {
    return this.api.get<InvestorAlias[]>('api/InvestorAlias');
  }

  createAlias(payload: InvestorAlias): Observable<InvestorAlias> {
    return this.api.post<InvestorAlias>('api/InvestorAlias', payload);
  }

  updateAlias(payload: InvestorAlias): Observable<InvestorAlias> {
    return this.api.put<InvestorAlias>(`api/InvestorAlias/${payload.investorAliasId}`, payload);
  }

  deleteAlias(investorAliasId: number): Observable<void> {
    return this.api.delete<void>(`api/InvestorAlias/${investorAliasId}`);
  }
}
