import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  FundCommitmentTimeframe,
  FundCommitmentsQueryParams,
  fundTimeGranularityFromTimeframe,
  FundDetailDto,
  FundGranularRowDto,
  FundListItemDto,
  FundNavQueryParams,
  FundNavTimeframe,
  FundPeriodDto,
  FundAssetDto,
  FundDistributionGroupDto,
  FundDistributionsQueryParams,
  FundInvestorDto,
  FundInvestmentsQueryParams,
  FundPeriodsQueryParams,
  FundUnfundedCommitmentsQueryParams,
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

  getFundAssetsPage(
    fundKey: number,
    params: { page?: number; pageSize?: number; search?: string } = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundAssetDto>> {
    const query = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    };
    return this.api.get<PagedResult<FundAssetDto>>(`api/Funds/${fundKey}/assets`, query as any);
  }

  getFundInvestorsPage(
    fundKey: number,
    params: { page?: number; pageSize?: number; search?: string } = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundInvestorDto>> {
    const query = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    };
    return this.api.get<PagedResult<FundInvestorDto>>(`api/Funds/${fundKey}/investors`, query as any);
  }

  getFundPeriodsPage(
    fundKey: number,
    params: FundPeriodsQueryParams,
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundPeriodDto>> {
    const query: FundPeriodsQueryParams = {
      view: params.view,
      source: params.source,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
    };
    return this.api.get<PagedResult<FundPeriodDto>>(`api/Funds/${fundKey}/periods`, query as any);
  }

  getFundCommitmentsPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundCommitmentsQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundGranularRowDto>> {
    const query: FundCommitmentsQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundGranularRowDto>>(`api/Funds/${fundKey}/commitments`, query as any);
  }

  getFundUnfundedCommitmentsPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundUnfundedCommitmentsQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundGranularRowDto>> {
    const query: FundUnfundedCommitmentsQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundGranularRowDto>>(
      `api/Funds/${fundKey}/unfunded-commitments`,
      query as any,
    );
  }

  getFundNavPage(
    fundKey: number,
    timeframe: FundNavTimeframe,
    params: Omit<FundNavQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundGranularRowDto>> {
    const query: FundNavQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundGranularRowDto>>(`api/Funds/${fundKey}/nav`, query as any);
  }

  getFundInvestmentsPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundInvestmentsQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundGranularRowDto>> {
    const query: FundInvestmentsQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundGranularRowDto>>(`api/Funds/${fundKey}/investments`, query as any);
  }

  getFundDistributionsPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundDistributionsQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundDistributionGroupDto>> {
    const query: FundDistributionsQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundDistributionGroupDto>>(
      `api/Funds/${fundKey}/distributions`,
      query as any,
    );
  }
}
