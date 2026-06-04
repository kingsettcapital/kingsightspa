import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';

@Injectable({ providedIn: 'root' })
export class CapitalInvestorsApiService {
  private readonly api = inject(ApiService);

  getInvestors(params: ListQueryParams = {}): Observable<PagedResult<InvestorListItemDto>> {
    return this.api.get<PagedResult<InvestorListItemDto>>('api/CapitalInvestors', params as any);
  }

  getInvestor(investorKey: number): Observable<InvestorDetailDto> {
    return this.api.get<InvestorDetailDto>(`api/CapitalInvestors/${investorKey}`);
  }

  getInvestorFunds(
    investorKey: number,
    params: Pick<ListQueryParams, 'page' | 'pageSize'> = {},
  ): Observable<PagedResult<InvestorInvestmentDto>> {
    const query: ListQueryParams = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? LIST_PAGE_SIZE,
    };
    return this.api.get<PagedResult<InvestorInvestmentDto>>(
      `api/CapitalInvestors/${investorKey}/funds`,
      query as any,
    );
  }
}
