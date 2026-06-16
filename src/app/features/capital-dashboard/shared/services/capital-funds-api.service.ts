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
  FundsFilterOptionsDto,
  FundsListQueryParams,
  FundsPagedResult,
  FundNavQueryParams,
  FundNavTimeframe,
  FundPeriodDto,
  FundAssetDto,
  FundDistributionGroupDto,
  FundDistributionsQueryParams,
  FundInvestorDto,
  FundInvestmentsQueryParams,
  FundPeriodsQueryParams,
  FundInvestorCapitalActivityDto,
  FundInvestorDistributionTableDto,
  FundInvestorIrrDto,
  FundTransactionTableQueryParams,
  FundUnfundedCommitmentsQueryParams,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';

@Injectable({ providedIn: 'root' })
export class CapitalFundsApiService {
  private readonly api = inject(ApiService);

  getFunds(params: FundsListQueryParams = {}): Observable<FundsPagedResult> {
    return this.api.get<FundsPagedResult>('api/Funds', params as any);
  }

  getFilterOptions(): Observable<FundsFilterOptionsDto> {
    return this.api.get<FundsFilterOptionsDto>('api/Funds/filter-options');
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

  getFundCapitalActivitiesPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundTransactionTableQueryParams, 'view' | 'fundKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundInvestorCapitalActivityDto>> {
    return this.api.get<PagedResult<FundInvestorCapitalActivityDto>>(
      `api/Funds/${fundKey}/capital-activities`,
      this.buildFundTransactionTableQuery(fundKey, timeframe, params, pageSize) as any,
    );
  }

  getFundDistributionTablePage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundTransactionTableQueryParams, 'view' | 'fundKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundInvestorDistributionTableDto>> {
    return this.api.get<PagedResult<FundInvestorDistributionTableDto>>(
      `api/Funds/${fundKey}/distributions-table`,
      this.buildFundTransactionTableQuery(fundKey, timeframe, params, pageSize) as any,
    );
  }

  getFundIrrPage(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundTransactionTableQueryParams, 'view' | 'fundKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundInvestorIrrDto>> {
    return this.api.get<PagedResult<FundInvestorIrrDto>>(
      `api/Funds/${fundKey}/irr`,
      this.buildFundTransactionTableQuery(fundKey, timeframe, params, pageSize) as any,
    );
  }

  private buildFundTransactionTableQuery(
    fundKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<FundTransactionTableQueryParams, 'view' | 'fundKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): FundTransactionTableQueryParams {
    return {
      fundKey,
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(timeframe === 'quarterly' && params.dateKey != null ? { dateKey: params.dateKey } : {}),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy, sortDir: params.sortDir ?? 'desc' } : {}),
    };
  }
}
