import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  DashboardQueryParams,
  DashboardResponseDto,
  DashboardWidgetOptionDto,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CapitalDashboardApiService {
  private readonly api = inject(ApiService);

  getWidgetOptions(): Observable<DashboardWidgetOptionDto[]> {
    return this.api.get<DashboardWidgetOptionDto[]>('api/Dashboard/widgets');
  }

  getDashboard(params: DashboardQueryParams = {}): Observable<DashboardResponseDto> {
    return this.api.get<DashboardResponseDto>('api/Dashboard', params as any);
  }
}
