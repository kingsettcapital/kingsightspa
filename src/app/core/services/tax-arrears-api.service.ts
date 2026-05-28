import { inject, Injectable } from '@angular/core';
import { delay, Observable, of } from 'rxjs';

import { TAX_ARREARS_EXAMPLE_DATA } from '../constants/tax-arrears-example.data';
import {
  TaxArrearsAddRecordPayload,
  TaxArrearsApiRecord,
  TaxArrearsBulkUpdateRequest,
} from '../interfaces/tax-arrears.interfaces';
import { ApiService } from './api.service';

/** Set to false when the live tax-arrears API is ready. */
const USE_TAX_ARREARS_EXAMPLE_DATA = true;

@Injectable({
  providedIn: 'root',
})
export class TaxArrearsApiService {
  private readonly api = inject(ApiService);

  getTaxArrears(): Observable<TaxArrearsApiRecord[]> {
    if (USE_TAX_ARREARS_EXAMPLE_DATA) {
      return of([...TAX_ARREARS_EXAMPLE_DATA]).pipe(delay(400));
    }
    return this.api.get<TaxArrearsApiRecord[]>('api/tax-arrears');
  }

  updateTaxArrearsBulk(request: TaxArrearsBulkUpdateRequest): Observable<TaxArrearsApiRecord[]> {
    if (USE_TAX_ARREARS_EXAMPLE_DATA) {
      for (const update of request.records) {
        const record = TAX_ARREARS_EXAMPLE_DATA.find(
          (item) => String(item['RecordKey'] ?? '') === update.recordKey,
        );
        if (!record) {
          continue;
        }
        record['TaxMemoDate'] = update.taxMemoDate;
        record['TaxArrears'] = update.taxArrears;
        record['TaxYear'] = update.taxYear;
        record['Notes'] = update.notes;
        record['UserUpdatedDate'] = update.userUpdatedDate.slice(0, 10);
        record['UserUpdatedBy'] = update.userUpdatedBy;
      }
      return of([...TAX_ARREARS_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.put<TaxArrearsApiRecord[]>('api/tax-arrears/bulk', request);
  }

  addTaxArrearsRecord(payload: TaxArrearsAddRecordPayload): Observable<TaxArrearsApiRecord[]> {
    if (USE_TAX_ARREARS_EXAMPLE_DATA) {
      const recordKey = `${payload.loanId}-${payload.taxYear}`;
      const existingIndex = TAX_ARREARS_EXAMPLE_DATA.findIndex(
        (item) => String(item['RecordKey'] ?? '') === recordKey,
      );
      const record: TaxArrearsApiRecord = {
        RecordKey: recordKey,
        LoanKey: payload.loanId,
        LoanId: payload.loanId,
        LoanDescription: payload.loanDescription,
        LoanAliasName: payload.loanAlias,
        TaxMemoDate: payload.taxMemoDate,
        TaxArrears: payload.taxArrears,
        TaxYear: payload.taxYear,
        Notes: payload.notes,
        SyndicateId: payload.syndicateId,
        SyndicateDescription: payload.syndicateDescription,
        FundingStatus: 'IN_DEFAULT',
        UserUpdatedDate: payload.userUpdatedDate.slice(0, 10),
        UserUpdatedBy: payload.userUpdatedBy,
      };
      if (existingIndex >= 0) {
        TAX_ARREARS_EXAMPLE_DATA[existingIndex] = record;
      } else {
        TAX_ARREARS_EXAMPLE_DATA.push(record);
      }
      return of([...TAX_ARREARS_EXAMPLE_DATA]).pipe(delay(500));
    }
    return this.api.post<TaxArrearsApiRecord[]>('api/tax-arrears', payload);
  }
}
