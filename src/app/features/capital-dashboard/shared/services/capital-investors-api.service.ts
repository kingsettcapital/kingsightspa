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
  InvestorCapitalActivityDto,
  InvestorDetailDto,
  InvestorDistributionTableDto,
  InvestorFundHoldingDto,
  InvestorFundHoldingsQueryParams,
  InvestorFundHoldingsResponseDto,
  InvestorInvestmentDto,
  InvestorIrrDto,
  InvestorCapitalObligationDto,
  InvestorNetAssetDto,
  InvestorListItemDto,
  InvestorTransactionTableFilterItemDto,
  InvestorTransactionTableFiltersDto,
  InvestorTransactionTableQueryParams,
  InvestorUnderlyingInvestmentDto,
  InvestorsFilterOptionsDto,
  InvestorsListQueryParams,
  InvestorsPagedResult,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';
import { QuarterlyTransactionPeriodParams } from '../utils/quarterly-transaction-period.util';

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

  getInvestorCapitalInvestmentsPage(
    investorKey: number,
    params: { page?: number; pageSize?: number } = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorUnderlyingInvestmentDto>> {
    const query: ListQueryParams = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
    };
    return this.api.get<PagedResult<InvestorUnderlyingInvestmentDto>>(
      `api/CapitalInvestors/${investorKey}/investments`,
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

  getInvestorCapitalActivitiesPage(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorCapitalActivityDto>> {
    return this.api.get<PagedResult<InvestorCapitalActivityDto>>(
      `api/CapitalInvestors/${investorKey}/capital-activities`,
      this.buildInvestorTransactionTableQuery(investorKey, timeframe, params, pageSize) as any,
    );
  }

  getInvestorDistributionTablePage(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorDistributionTableDto>> {
    return this.api.get<PagedResult<InvestorDistributionTableDto>>(
      `api/CapitalInvestors/${investorKey}/distributions-table`,
      this.buildInvestorTransactionTableQuery(investorKey, timeframe, params, pageSize) as any,
    );
  }

  getInvestorIrrPage(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorIrrDto>> {
    return this.api.get<PagedResult<InvestorIrrDto>>(
      `api/CapitalInvestors/${investorKey}/irr`,
      this.buildInvestorTransactionTableQuery(investorKey, timeframe, params, pageSize) as any,
    );
  }

  getInvestorCapitalActivitiesFilters(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    return this.api.get<InvestorTransactionTableFiltersDto>(
      `api/CapitalInvestors/${investorKey}/capital-activities/filters`,
      this.buildInvestorTransactionFiltersQuery(timeframe, params) as any,
    );
  }

  getInvestorDistributionTableFilters(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    return this.api.get<InvestorTransactionTableFiltersDto>(
      `api/CapitalInvestors/${investorKey}/distributions-table/filters`,
      this.buildInvestorTransactionFiltersQuery(timeframe, params) as any,
    );
  }

  getInvestorIrrFilters(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    return this.api.get<InvestorTransactionTableFiltersDto>(
      `api/CapitalInvestors/${investorKey}/irr/filters`,
      this.buildInvestorTransactionFiltersQuery(timeframe, params) as any,
    );
  }

  getInvestorCapitalObligationsPage(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorCapitalObligationDto>> {
    return this.api.get<PagedResult<InvestorCapitalObligationDto>>(
      `api/CapitalInvestors/${investorKey}/capital-obligations`,
      this.buildInvestorTransactionTableQuery(investorKey, timeframe, params, pageSize) as any,
    );
  }

  getInvestorCapitalObligationsFilters(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    return this.api.get<InvestorTransactionTableFiltersDto>(
      `api/CapitalInvestors/${investorKey}/capital-obligations/filters`,
      this.buildInvestorTransactionFiltersQuery(timeframe, params) as any,
    );
  }

  getInvestorNetAssetsPage(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorNetAssetDto>> {
    return this.api.get<PagedResult<InvestorNetAssetDto>>(
      `api/CapitalInvestors/${investorKey}/net-assets`,
      this.buildInvestorTransactionTableQuery(investorKey, timeframe, params, pageSize) as any,
    );
  }

  getInvestorNetAssetsFilters(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    return this.api.get<InvestorTransactionTableFiltersDto>(
      `api/CapitalInvestors/${investorKey}/net-assets/filters`,
      this.buildInvestorTransactionFiltersQuery(timeframe, params) as any,
    );
  }

  getInvestorFundHoldings(
    investorKey: number,
  ): Observable<InvestorFundHoldingsResponseDto> {
    return this.api.get<InvestorFundHoldingsResponseDto>(
      `api/CapitalInvestors/${investorKey}/fund-holdings`,
    );
  }

  /** @deprecated Use getInvestorFundHoldings. */
  getInvestorFundHoldingsPage(
    investorKey: number,
    params: InvestorFundHoldingsQueryParams = {},
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<InvestorFundHoldingDto>> {
    const query: InvestorFundHoldingsQueryParams = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...(params.sinceStart?.trim() ? { sinceStart: params.sinceStart.trim() } : {}),
      ...(params.sinceEnd?.trim() ? { sinceEnd: params.sinceEnd.trim() } : {}),
    };
    return this.api.get<PagedResult<InvestorFundHoldingDto>>(
      `api/CapitalInvestors/${investorKey}/fund-holdings`,
      query as any,
    );
  }

  private buildInvestorTransactionTableQuery(
    investorKey: number,
    timeframe: FundCommitmentTimeframe,
    params: Omit<InvestorTransactionTableQueryParams, 'view' | 'investorKey'> = {},
    pageSize = LIST_PAGE_SIZE,
  ): InvestorTransactionTableQueryParams {
    return {
      investorKey,
      view: fundTimeGranularityFromTimeframe(timeframe),
      page: params.page ?? 1,
      pageSize: params.pageSize ?? pageSize,
      ...this.buildInvestorQuarterlyPeriodQuery(timeframe, params),
      ...(params.search?.trim() ? { search: params.search.trim() } : {}),
      ...(params.fundCode?.trim() ? { fundCode: params.fundCode.trim() } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy, sortDir: params.sortDir ?? 'desc' } : {}),
    };
  }

  private buildInvestorTransactionFiltersQuery(
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams = {},
  ): Pick<InvestorTransactionTableQueryParams, 'view' | 'dateKey' | 'calendarYear'> {
    return {
      view: fundTimeGranularityFromTimeframe(timeframe),
      ...this.buildInvestorQuarterlyPeriodQuery(timeframe, params),
    };
  }

  private buildInvestorQuarterlyPeriodQuery(
    timeframe: FundCommitmentTimeframe,
    params: QuarterlyTransactionPeriodParams,
  ): Pick<InvestorTransactionTableQueryParams, 'dateKey' | 'calendarYear'> {
    if (timeframe !== 'quarterly') {
      return {};
    }
    if (params.dateKey != null) {
      return { dateKey: params.dateKey };
    }
    if (params.calendarYear != null) {
      return { calendarYear: params.calendarYear };
    }
    return {};
  }
}
