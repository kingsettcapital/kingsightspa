import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { OTHER_COST_EXAMPLE_DATA } from '../constants/other-cost-example.data';
import {
  OtherCostApiRecord,
  OtherCostBulkUpdateRequest,
} from '../interfaces/other-cost.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live other-cost API is ready. */
const USE_OTHER_COST_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class OtherCostApiService {
  private readonly api = inject(ApiService);

  getOtherCosts(): Observable<OtherCostApiRecord[]> {
    if (USE_OTHER_COST_EXAMPLE_DATA) {
      return of([...OTHER_COST_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<OtherCostApiRecord[]>('api/other-costs');
  }

  updateOtherCostsBulk(request: OtherCostBulkUpdateRequest): Observable<OtherCostApiRecord[]> {
    if (USE_OTHER_COST_EXAMPLE_DATA) {
      for (const update of request.loans) {
        const record = OTHER_COST_EXAMPLE_DATA.find(
          (item) => String(item['LoanKey'] ?? '') === update.loanKey,
        );
        if (!record) {
          continue;
        }
        record['OutstandingInvoices'] = update.outstandingInvoices;
        record['EstRealizationCosts'] = update.estRealizationCosts;
        record['CostToComplete'] = update.costToComplete;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...OTHER_COST_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<OtherCostApiRecord[]>('api/other-costs/bulk', request);
  }
}
