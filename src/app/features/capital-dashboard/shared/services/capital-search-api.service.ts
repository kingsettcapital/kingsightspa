import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import { CapitalSearchQueryParams, CapitalSearchResponseDto } from '../models/search.models';

const DEFAULT_SEARCH_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class CapitalSearchApiService {
  private readonly api = inject(ApiService);

  search(params: CapitalSearchQueryParams): Observable<CapitalSearchResponseDto> {
    return this.api.get<CapitalSearchResponseDto>('api/Search', {
      search: params.search.trim(),
      limit: params.limit ?? DEFAULT_SEARCH_LIMIT,
    });
  }
}
