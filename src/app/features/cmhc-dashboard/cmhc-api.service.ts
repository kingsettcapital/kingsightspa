import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../core/services/api.service';
import { CmhcPipelineDto, CmhcReportStateDto, CmhcStateKey } from './cmhc-dashboard.models';

@Injectable({ providedIn: 'root' })
export class CmhcApiService {
  private readonly api = inject(ApiService);

  getPipeline(asOf?: string): Observable<CmhcPipelineDto> {
    return this.api.get<CmhcPipelineDto>('api/CmhcDashboard/pipeline', asOf ? { asOf } : undefined);
  }

  getState(key: CmhcStateKey): Observable<CmhcReportStateDto> {
    return this.api.get<CmhcReportStateDto>(`api/CmhcDashboard/state/${key}`);
  }

  putState(key: CmhcStateKey, value: unknown, version: number): Observable<CmhcReportStateDto> {
    return this.api.put<CmhcReportStateDto>(`api/CmhcDashboard/state/${key}`, { value, version });
  }
}
