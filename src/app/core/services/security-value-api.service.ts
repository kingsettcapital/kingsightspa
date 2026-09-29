import { inject, Injectable } from '@angular/core';

import {
  SecurityValueApiRecord,
  SecurityValueBulkUpdateRequest,
} from '../interfaces/security-value.interfaces';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class SecurityValueApiService {
  private readonly api = inject(ApiService);

  getSecurityValues() {
    return this.api.get<SecurityValueApiRecord[]>('api/security-values');
  }

  updateSecurityValuesBulk(request: SecurityValueBulkUpdateRequest) {
    return this.api.put<SecurityValueApiRecord[]>('api/security-values/bulk', request);
  }
}
