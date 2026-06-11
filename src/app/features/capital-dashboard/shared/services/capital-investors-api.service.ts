import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  FundCommitmentTimeframe,
  FundCommitmentsQueryParams,
  FundDistributionGroupDto,
  FundDistributionsQueryParams,
  FundGranularRowDto,
  FundInvestmentsQueryParams,
  FundNavQueryParams,
  FundNavTimeframe,
  FundPeriodDto,
  FundPeriodsQueryParams,
  FundPeriodSource,
  FundTimeGranularity,
  FundUnfundedCommitmentsQueryParams,
  fundTimeGranularityFromTimeframe,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  InvestorsFilterOptionsDto,
  InvestorsListQueryParams,
  InvestorsPagedResult,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';

@Injectable({ providedIn: 'root' })
export class CapitalInvestorsApiService {
  private readonly api = inject(ApiService);

  getInvestors(params: InvestorsListQueryParams = {}): Observable<InvestorsPagedResult> {
    return this.api.get<InvestorsPagedResult>('api/CapitalInvestors', params as any);
  }

  getFilterOptions(): Observable<InvestorsFilterOptionsDto> {
    return this.api.get<InvestorsFilterOptionsDto>('api/CapitalInvestors/filter-options');
  }

  getInvestor(investorKey: number): Observable<InvestorDetailDto> {
    return this.api.get<InvestorDetailDto>(`api/CapitalInvestors/${investorKey}`);
  }

  getInvestorFundsPage(
    investorKey: number,
    params: { page?: number; pageSize?: number; search?: string } = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorInvestmentDto>> {
    const query: ListQueryParams = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
    };
    return this.api.get<PagedResult<InvestorInvestmentDto>>(
      `api/CapitalInvestors/${investorKey}/funds`,
      query as any,
    );
  }

  getInvestorPeriodsPage(
    investorKey: number,
    params: FundPeriodsQueryParams,
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundPeriodDto>> {
    const query: FundPeriodsQueryParams = {
      view: params.view,
      source: params.source,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
    };
    return this.api.get<PagedResult<FundPeriodDto>>(
      `api/CapitalInvestors/${investorKey}/periods`,
      query as any,
    );
  }

  getInvestorCommitmentsPage(
    investorKey: number,
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
    return this.api.get<PagedResult<FundGranularRowDto>>(
      `api/CapitalInvestors/${investorKey}/commitments`,
      query as any,
    );
  }

  getInvestorUnfundedCommitmentsPage(
    investorKey: number,
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
      `api/CapitalInvestors/${investorKey}/unfunded-commitments`,
      query as any,
    );
  }

  getInvestorInvestmentsPage(
    investorKey: number,
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
    return this.api.get<PagedResult<FundGranularRowDto>>(
      `api/CapitalInvestors/${investorKey}/investments`,
      query as any,
    );
  }

  getInvestorDistributionsPage(
    investorKey: number,
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
      `api/CapitalInvestors/${investorKey}/distributions`,
      query as any,
    );
  }

  getInvestorNavPage(
    investorKey: number,
    timeframe: FundNavTimeframe,
    params: Omit<FundNavQueryParams, 'view'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<FundGranularRowDto>> {
    const query: FundNavQueryParams = {
      view: fundTimeGranularityFromTimeframe(timeframe) as FundTimeGranularity,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.dateKey != null ? { dateKey: params.dateKey } : {}),
    };
    return this.api.get<PagedResult<FundGranularRowDto>>(
      `api/CapitalInvestors/${investorKey}/nav`,
      query as any,
    );
  }
}
