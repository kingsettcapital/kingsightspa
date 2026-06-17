import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import {
  DataExplorerColumnGroupDto,
  DataExplorerDataRequest,
  DataExplorerDataResponse,
} from '../interfaces/data-explorer-api.models';

import { DATA_EXPLORER_DEFAULT_PAGE_SIZE } from '../constants/data-explorer.constants';

export const DATA_EXPLORER_PAGE_SIZE = DATA_EXPLORER_DEFAULT_PAGE_SIZE;

@Injectable({ providedIn: 'root' })
export class DataExplorerApiService {
  private readonly api = inject(ApiService);

  getColumns(): Observable<DataExplorerColumnGroupDto[]> {
    return this.api.get<DataExplorerColumnGroupDto[]>('api/data-explorer/columns');
  }

  queryData(request: DataExplorerDataRequest): Observable<DataExplorerDataResponse> {
    return this.api.post<DataExplorerDataResponse>('api/data-explorer/data', request);
  }
}
