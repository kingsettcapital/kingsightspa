import { inject, Injectable } from '@angular/core';

import {
  TaxArrearsAddRecordPayload,
  TaxArrearsApiRecord,
  TaxArrearsBulkUpdateRequest,
} from '../interfaces/tax-arrears.interfaces';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class TaxArrearsApiService {
  private readonly api = inject(ApiService);

  getTaxArrears() {
    return this.api.get<TaxArrearsApiRecord[]>('api/tax-arrears');
  }

  updateTaxArrearsBulk(request: TaxArrearsBulkUpdateRequest) {
    return this.api.put<TaxArrearsApiRecord[]>('api/tax-arrears/bulk', request);
  }

  addTaxArrearsRecord(payload: TaxArrearsAddRecordPayload) {
    return this.api.post<TaxArrearsApiRecord[]>('api/tax-arrears', payload);
  }
}
