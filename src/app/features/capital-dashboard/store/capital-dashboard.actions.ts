import { createActionGroup, emptyProps, props } from '@ngrx/store';

import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundAssetTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundInvestorCapitalActivityTabRow,
  FundInvestorDistributionTableTabRow,
  FundInvestorIrrTabRow,
  FundInvestorCapitalObligationTabRow,
  FundInvestorNetAssetTabRow,
  FundListItemDto,
  FundsListQueryParams,
  FundsPagedResult,
  FundPeriodDto,
  FundPeriodSource,
  InvestorCapitalActivityTabRow,
  InvestorDetailDto,
  InvestorDistributionTableTabRow,
  InvestorFundHoldingTabRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
  InvestorCapitalObligationTabRow,
  InvestorNetAssetTabRow,
  InvestorListItemDto,
  InvestorUnderlyingInvestmentTabRow,
  InvestorsListQueryParams,
  PagedResult,
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
  AssetFundHoldingTabRow,
  AssetPropertyDetailTabRow,
  AssetTypeSummaryRow,
  AssetsQueryParams,
  AssetsPagedResult,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundInvestorTabRow } from '../shared/mappers/fund-investor.mapper';
import { AssetFinancialMetricsRow } from '../shared/mappers/asset-financial-metrics.mapper';
import { AssetAcquisitionSaleRow } from '../shared/mappers/asset-acquisition-sale.mapper';
import { CapitalDashboardTab } from './capital-dashboard.state';

export const CapitalDashboardShellActions = createActionGroup({
  source: 'Capital Dashboard Shell',
  events: {
    'Active Tab Changed': props<{ tab: CapitalDashboardTab }>(),
  },
});

/** Clears all Capital Dashboard API cache (call when leaving /capital-dashboard). */
export const CapitalDashboardCacheActions = createActionGroup({
  source: 'Capital Dashboard Cache',
  events: {
    'Reset All': emptyProps(),
  },
});

export const InvestorsApiActions = createActionGroup({
  source: 'Capital Dashboard Investors API',
  events: {
    'Load List': props<{
      search: string;
      page: number;
      replace: boolean;
      cacheKey?: string;
      apiParams?: InvestorsListQueryParams;
    }>(),
    'Load List Success': props<{ result: PagedResult<InvestorListItemDto>; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ investorKey: number }>(),
    'Load Detail Success': props<{
      investorKey: number;
      detail: InvestorDetailDto;
      investments: InvestorInvestmentDto[];
      investmentsHasNextPage: boolean;
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Load Investor Funds Page': props<{ investorKey: number; page: number; search: string }>(),
    'Load Investor Funds Page Success': props<{
      page: number;
      items: InvestorInvestmentDto[];
      hasNextPage: boolean;
      append: boolean;
    }>(),
    'Load Investor Funds Page Failure': emptyProps(),
    'Load Investor Periods': props<{
      investorKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
    }>(),
    'Load Investor Periods Success': props<{
      investorKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
      items: FundPeriodDto[];
    }>(),
    'Load Investor Periods Failure': props<{
      investorKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
      error: string;
    }>(),
    'Load Investor Commitments Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Investor Commitments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundAmountTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Investor Commitments Page Failure': props<{ error: string }>(),
    'Load Investor Unfunded Commitments Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Investor Unfunded Commitments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundAmountTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Investor Unfunded Commitments Page Failure': props<{ error: string }>(),
    'Load Investor Capital Investments Page': props<{
      investorKey: number;
      page: number;
      replace: boolean;
    }>(),
    'Load Investor Capital Investments Page Success': props<{
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorUnderlyingInvestmentTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
    }>(),
    'Load Investor Capital Investments Page Failure': props<{ error: string }>(),
    'Load Investor Distributions Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Investor Distributions Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundDistributionGroupTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Investor Distributions Page Failure': props<{ error: string }>(),
    'Load Investor Nav Page': props<{
      investorKey: number;
      timeframe: FundNavTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Investor Nav Page Success': props<{
      timeframe: FundNavTimeframe;
      page: number;
      items: FundNavTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Investor Nav Page Failure': props<{ error: string }>(),
    'Load Investor Capital Activities Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Capital Activities Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorCapitalActivityTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
    }>(),
    'Load Investor Capital Activities Page Failure': props<{ error: string }>(),
    'Load Investor Distribution Table Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Distribution Table Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorDistributionTableTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
    }>(),
    'Load Investor Distribution Table Page Failure': props<{ error: string }>(),
    'Load Investor Irr Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Irr Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorIrrTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
    }>(),
    'Load Investor Irr Page Failure': props<{ error: string }>(),
    'Load Investor Capital Obligations Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Capital Obligations Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorCapitalObligationTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
    }>(),
    'Load Investor Capital Obligations Page Failure': props<{ error: string }>(),
    'Load Investor Net Assets Page': props<{
      investorKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Net Assets Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: InvestorNetAssetTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      fundCode?: string;
      sortBy?: string;
    }>(),
    'Load Investor Net Assets Page Failure': props<{ error: string }>(),
    'Load Investor Fund Holdings': props<{ investorKey: number }>(),
    'Load Investor Fund Holdings Success': props<{
      items: InvestorFundHoldingTabRow[];
      dateKey: number | null;
    }>(),
    'Load Investor Fund Holdings Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});

export const FundsApiActions = createActionGroup({
  source: 'Capital Dashboard Funds API',
  events: {
    'Load List': props<{
      search: string;
      page: number;
      replace: boolean;
      cacheKey?: string;
      apiParams?: FundsListQueryParams;
    }>(),
    'Load List Success': props<{ result: FundsPagedResult; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ fundKey: number }>(),
    'Load Detail Success': props<{
      fundKey: number;
      detail: FundDetailDto;
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Load Fund Assets Page': props<{ fundKey: number; page: number; search: string; replace?: boolean }>(),
    'Load Fund Assets Page Success': props<{
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundAssetTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
    }>(),
    'Load Fund Assets Page Failure': emptyProps(),
    'Load Fund Investors Page': props<{ fundKey: number; page: number; search: string }>(),
    'Load Fund Investors Page Success': props<{
      page: number;
      items: FundInvestorTabRow[];
      hasNextPage: boolean;
      append: boolean;
    }>(),
    'Load Fund Investors Page Failure': emptyProps(),
    'Load Fund Periods': props<{
      fundKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
    }>(),
    'Load Fund Periods Success': props<{
      fundKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
      items: FundPeriodDto[];
    }>(),
    'Load Fund Periods Failure': props<{
      fundKey: number;
      source: FundPeriodSource;
      view: FundCommitmentTimeframe;
      error: string;
    }>(),
    'Load Fund Commitments Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Fund Commitments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundAmountTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Fund Commitments Page Failure': props<{ error: string }>(),
    'Load Fund Unfunded Commitments Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Fund Unfunded Commitments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundAmountTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Fund Unfunded Commitments Page Failure': props<{ error: string }>(),
    'Load Fund Investments Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Fund Investments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundCommitmentTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Fund Investments Page Failure': props<{ error: string }>(),
    'Load Fund Distributions Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Fund Distributions Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundDistributionGroupTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Fund Distributions Page Failure': props<{ error: string }>(),
    'Load Fund Nav Page': props<{
      fundKey: number;
      timeframe: FundNavTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Fund Nav Page Success': props<{
      timeframe: FundNavTimeframe;
      page: number;
      items: FundNavTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
    }>(),
    'Load Fund Nav Page Failure': props<{ error: string }>(),
    'Load Fund Capital Activities Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Capital Activities Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundInvestorCapitalActivityTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
    }>(),
    'Load Fund Capital Activities Page Failure': props<{ error: string }>(),
    'Load Fund Distribution Table Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Distribution Table Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundInvestorDistributionTableTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
    }>(),
    'Load Fund Distribution Table Page Failure': props<{ error: string }>(),
    'Load Fund Irr Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Irr Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundInvestorIrrTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
    }>(),
    'Load Fund Irr Page Failure': props<{ error: string }>(),
    'Load Fund Capital Obligations Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Capital Obligations Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundInvestorCapitalObligationTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
    }>(),
    'Load Fund Capital Obligations Page Failure': props<{ error: string }>(),
    'Load Fund Net Assets Page': props<{
      fundKey: number;
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Net Assets Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
      items: FundInvestorNetAssetTabRow[];
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      calendarYear?: number;
      investorName?: string;
      sortBy?: string;
    }>(),
    'Load Fund Net Assets Page Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});

export const AssetsApiActions = createActionGroup({
  source: 'Capital Dashboard Assets API',
  events: {
    'Load List': props<{
      search: string;
      page: number;
      replace: boolean;
      cacheKey?: string;
      apiParams?: AssetsQueryParams;
    }>(),
    'Load List Success': props<{ result: AssetsPagedResult; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ propertyKey: number }>(),
    'Load Detail Success': props<{
      propertyKey: number;
      detail: PropertyDetailDto;
      leasingSummary: PropertyLeasingSummaryDto | null;
      propertyDetails: AssetPropertyDetailTabRow[];
      assetTypeSummary: AssetTypeSummaryRow[];
      financialMetrics: AssetFinancialMetricsRow | null;
      acquisitionSale: AssetAcquisitionSaleRow | null;
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Load Fund Holdings': props<{ propertyKey: number }>(),
    'Load Fund Holdings Success': props<{ items: AssetFundHoldingTabRow[] }>(),
    'Load Fund Holdings Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});
