import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { LTV_VALIDATION_EXAMPLE_DATA } from '../constants/ltv-validation-example.data';
import {
  LtvValidationApiRecord,
  LtvValidationBulkUpdateRequest,
} from '../interfaces/ltv-validation.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live LTV validation API is ready. */
const USE_LTV_VALIDATION_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class LtvValidationApiService {
  private readonly api = inject(ApiService);

  getLtvValidationRecords(): Observable<LtvValidationApiRecord[]> {
    if (USE_LTV_VALIDATION_EXAMPLE_DATA) {
      return of([...LTV_VALIDATION_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<LtvValidationApiRecord[]>('api/ltv-validation');
  }

  updateLtvValidationBulk(
    request: LtvValidationBulkUpdateRequest,
  ): Observable<LtvValidationApiRecord[]> {
    if (USE_LTV_VALIDATION_EXAMPLE_DATA) {
      for (const update of request.records) {
        const record = LTV_VALIDATION_EXAMPLE_DATA.find(
          (item) => String(item['RecordKey'] ?? '') === update.recordKey,
        );
        if (!record) {
          continue;
        }
        record['SecurityValue'] = update.securityValue;
        record['LTV'] = update.ltv;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...LTV_VALIDATION_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<LtvValidationApiRecord[]>('api/ltv-validation/bulk', request);
  }
}
