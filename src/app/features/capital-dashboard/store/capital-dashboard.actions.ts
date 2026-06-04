import { createActionGroup, emptyProps, props } from '@ngrx/store';

import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundAssetTabRow,
  FundDistributionGroupTabRow,
  FundInvestorDto,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundListItemDto,
  FundPeriodDto,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundPeriodSource } from '../investments/tabs/fund-period.util';
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
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<InvestorListItemDto>; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ investorKey: number }>(),
    'Load Detail Success': props<{
      investorKey: number;
      detail: InvestorDetailDto;
      investments: InvestorInvestmentDto[];
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});

export const FundsApiActions = createActionGroup({
  source: 'Capital Dashboard Funds API',
  events: {
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<FundListItemDto>; replace: boolean }>(),
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
      items: FundInvestorDto[];
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
    'Clear Detail': emptyProps(),
  },
});

export const AssetsApiActions = createActionGroup({
  source: 'Capital Dashboard Assets API',
  events: {
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<PropertyListItemDto>; replace: boolean }>(),
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
