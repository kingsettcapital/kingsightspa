import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';
import {
  DefaultDateApiRecord,
  DefaultDateBulkUpdateRequest,
} from '../interfaces/default-date.interfaces';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class DefaultDateApiService {
  private readonly api = inject(ApiService);

  getDefaultDates() {
    return this.api.get<DefaultDateApiRecord[]>('api/default-dates');
  }

  updateDefaultDatesBulk(request: DefaultDateBulkUpdateRequest) {
    return this.api.put<DefaultDateApiRecord[]>('api/default-dates/bulk', request);
  }
}
