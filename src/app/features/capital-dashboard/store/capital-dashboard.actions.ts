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
  FundListItemDto,
  FundsListQueryParams,
  FundsPagedResult,
  FundPeriodDto,
  FundPeriodSource,
  InvestorCapitalActivityTabRow,
  InvestorDetailDto,
  InvestorDistributionTableTabRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
  InvestorListItemDto,
  InvestorsListQueryParams,
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  AssetsQueryParams,
  AssetsPagedResult,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundInvestorTabRow } from '../shared/mappers/fund-investor.mapper';
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
      timeframe: FundCommitmentTimeframe;
      page: number;
      search: string;
      replace: boolean;
      dateKey?: number;
    }>(),
    'Load Investor Capital Investments Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundCommitmentTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Capital Activities Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: InvestorCapitalActivityTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Distribution Table Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: InvestorDistributionTableTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Investor Irr Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: InvestorIrrTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      sortBy?: string;
    }>(),
    'Load Investor Irr Page Failure': props<{ error: string }>(),
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
      assets: FundAssetTabRow[];
      assetsHasNextPage: boolean;
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Load Fund Assets Page': props<{ fundKey: number; page: number; search: string }>(),
    'Load Fund Assets Page Success': props<{
      page: number;
      items: FundAssetTabRow[];
      hasNextPage: boolean;
      append: boolean;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Capital Activities Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundInvestorCapitalActivityTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Distribution Table Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundInvestorDistributionTableTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
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
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    }>(),
    'Load Fund Irr Page Success': props<{
      timeframe: FundCommitmentTimeframe;
      page: number;
      items: FundInvestorIrrTabRow[];
      hasNextPage: boolean;
      replace: boolean;
      search: string;
      dateKey?: number;
      sortBy?: string;
    }>(),
    'Load Fund Irr Page Failure': props<{ error: string }>(),
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
      investments: PropertyInvestmentDto[];
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});
