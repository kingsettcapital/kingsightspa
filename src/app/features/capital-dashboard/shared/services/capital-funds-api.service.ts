import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  FundCommitmentDto,
  FundCommitmentTimeframe,
  FundCommitmentsQueryParams,
  fundCommitmentsViewFromTimeframe,
  FundDetailDto,
  FundInvestorDto,
  FundListItemDto,
  FundNavDto,
  FundNavQueryParams,
  FundNavTimeframe,
  fundNavViewFromTimeframe,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';

@Injectable({ providedIn: 'root' })
export class CapitalFundsApiService {
  private readonly api = inject(ApiService);

  getFunds(params: ListQueryParams = {}): Observable<PagedResult<FundListItemDto>> {
    return this.api.get<PagedResult<FundListItemDto>>('api/Funds', params as any);
  }

  getFund(fundKey: number): Observable<FundDetailDto> {
    return this.api.get<FundDetailDto>(`api/Funds/${fundKey}`);
  }

  getFundInvestors(fundKey: number, params: { search?: string } = {}): Observable<FundInvestorDto[]> {
    return this.api.get<FundInvestorDto[]>(`api/Funds/${fundKey}/investors`, params as any);
  }

  getFundCommitmentsPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundCommitmentsQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundCommitmentDto>> {
    const query: FundCommitmentsQueryParams = {
      view: fundCommitmentsViewFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.quarterYear?.trim() ? { quarterYear: params.quarterYear.trim() } : {}),
    };
    return this.api.get<PagedResult<FundCommitmentDto>>(`api/Funds/${fundKey}/commitments`, query as any);
  }

  getFundNavPage(
    fundKey: number,
    timeframe: FundNavTimeframe,
    params: Omit<FundNavQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundNavDto>> {
    const query: FundNavQueryParams = {
      view: fundNavViewFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.quarterYear?.trim() ? { quarterYear: params.quarterYear.trim() } : {}),
    };
    return this.api.get<PagedResult<FundNavDto>>(`api/Funds/${fundKey}/nav`, query as any);
  }
}

