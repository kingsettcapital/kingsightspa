import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundInvestorDto,
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
import { fundPeriodsCacheKey, FundPeriodSource } from '../investments/tabs/fund-period.util';
import { PagedListState } from './capital-dashboard.state';

export interface ListCacheEntry<T> {
  items: T[];
  page: number;
  totalCount: number;
  hasNextPage: boolean;
}

export function capitalDashboardListCacheKey(search: string, page: number): string {
  return `${search}\u0000${page}`;
}

export function capitalDashboardFundAssetsCacheKey(
  fundKey: number,
  fundCode: string,
  page: number,
): string {
  return `${fundKey}\u0000${fundCode}\u0000${page}`;
}

function fundGranularPageDateKeySegment(dateKey?: number): string {
  return dateKey != null ? String(dateKey) : '';
}

export function capitalDashboardFundPeriodsCacheKey(
  fundKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
): string {
  return fundPeriodsCacheKey(fundKey, source, view);
}

export interface FundPeriodsCacheEntry {
  items: FundPeriodDto[];
}

export function readFundPeriodsCache(
  cache: Record<string, FundPeriodsCacheEntry>,
  fundKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
): FundPeriodsCacheEntry | null {
  return cache[capitalDashboardFundPeriodsCacheKey(fundKey, source, view)] ?? null;
}

export function writeFundPeriodsCache(
  cache: Record<string, FundPeriodsCacheEntry>,
  fundKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
  items: FundPeriodDto[],
): Record<string, FundPeriodsCacheEntry> {
  const key = capitalDashboardFundPeriodsCacheKey(fundKey, source, view);
  return {
    ...cache,
    [key]: { items: [...items] },
  };
}

export function capitalDashboardFundCommitmentsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `${fundKey}\u0000${timeframe}\u0000${page}\u0000${fundGranularPageDateKeySegment(dateKey)}`;
}

export function capitalDashboardFundUnfundedCommitmentsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `unfunded\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${fundGranularPageDateKeySegment(dateKey)}`;
}

export function capitalDashboardFundInvestmentsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `investments\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${fundGranularPageDateKeySegment(dateKey)}`;
}

export function capitalDashboardFundDistributionsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `distributions\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${fundGranularPageDateKeySegment(dateKey)}`;
}

export interface FundAmountPageCacheEntry {
  items: FundAmountTabRow[];
  hasNextPage: boolean;
}

export interface FundCommitmentsPageCacheEntry {
  items: FundCommitmentTabRow[];
  hasNextPage: boolean;
}

export function readFundCommitmentsPageCache(
  cache: Record<string, FundAmountPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): FundAmountPageCacheEntry | null {
  return cache[capitalDashboardFundCommitmentsCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundCommitmentsPageCache(
  cache: Record<string, FundAmountPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundAmountTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundAmountPageCacheEntry> {
  const key = capitalDashboardFundCommitmentsCacheKey(fundKey, timeframe, page, dateKey);
  return {
    ...cache,
    [key]: {
      items: [...items],
      hasNextPage,
    },
  };
}

export function readFundUnfundedCommitmentsPageCache(
  cache: Record<string, FundAmountPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): FundAmountPageCacheEntry | null {
  return cache[capitalDashboardFundUnfundedCommitmentsCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundUnfundedCommitmentsPageCache(
  cache: Record<string, FundAmountPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundAmountTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundAmountPageCacheEntry> {
  const key = capitalDashboardFundUnfundedCommitmentsCacheKey(fundKey, timeframe, page, dateKey);
  return {
    ...cache,
    [key]: {
      items: [...items],
      hasNextPage,
    },
  };
}

export function readFundInvestmentsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): FundCommitmentsPageCacheEntry | null {
  return cache[capitalDashboardFundInvestmentsCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundInvestmentsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundCommitmentTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundCommitmentsPageCacheEntry> {
  const key = capitalDashboardFundInvestmentsCacheKey(fundKey, timeframe, page, dateKey);
  return {
    ...cache,
    [key]: {
      items: [...items],
      hasNextPage,
    },
  };
}

export function readFundDistributionsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): FundCommitmentsPageCacheEntry | null {
  return cache[capitalDashboardFundDistributionsCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundDistributionsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundCommitmentTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundCommitmentsPageCacheEntry> {
  const key = capitalDashboardFundDistributionsCacheKey(fundKey, timeframe, page, dateKey);
  return {
    ...cache,
    [key]: {
      items: [...items],
      hasNextPage,
    },
  };
}

export function capitalDashboardFundNavCacheKey(
  fundKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `nav\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${fundGranularPageDateKeySegment(dateKey)}`;
}

export interface FundNavPageCacheEntry {
  items: FundNavTabRow[];
  hasNextPage: boolean;
}

export function readFundNavPageCache(
  cache: Record<string, FundNavPageCacheEntry>,
  fundKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  dateKey?: number,
): FundNavPageCacheEntry | null {
  return cache[capitalDashboardFundNavCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundNavPageCache(
  cache: Record<string, FundNavPageCacheEntry>,
  fundKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  items: FundNavTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundNavPageCacheEntry> {
  const key = capitalDashboardFundNavCacheKey(fundKey, timeframe, page, dateKey);
  return {
    ...cache,
    [key]: {
      items: [...items],
      hasNextPage,
    },
  };
}

export function readListCacheEntry<T>(
  cache: Record<string, ListCacheEntry<T>>,
  search: string,
  page: number,
): ListCacheEntry<T> | null {
  return cache[capitalDashboardListCacheKey(search, page)] ?? null;
}

export function writeListCacheEntry<T>(
  cache: Record<string, ListCacheEntry<T>>,
  search: string,
  result: PagedResult<T>,
  page: number,
): Record<string, ListCacheEntry<T>> {
  const key = capitalDashboardListCacheKey(search, page);
  return {
    ...cache,
    [key]: {
      items: [...(result.items ?? [])],
      page: result.page ?? page,
      totalCount: result.totalCount ?? 0,
      hasNextPage: !!result.hasNextPage,
    },
  };
}

export function listStateFromCacheEntry<T>(
  search: string,
  entry: ListCacheEntry<T>,
): PagedListState<T> {
  return {
    items: [...entry.items],
    search,
    page: entry.page,
    totalCount: entry.totalCount,
    hasNextPage: entry.hasNextPage,
    loading: false,
    loadingMore: false,
    error: null,
  };
}

export interface InvestorDetailCacheEntry {
  detail: InvestorDetailDto;
  investments: InvestorInvestmentDto[];
}

export interface FundDetailCacheEntry {
  detail: FundDetailDto;
  investors: FundInvestorDto[];
  assets: PropertyListItemDto[];
  assetsPage: number;
  assetsFundCode: string | null;
  assetsHasNextPage: boolean;
}

export interface FundAssetsPageCacheEntry {
  items: PropertyListItemDto[];
  hasNextPage: boolean;
}

export interface AssetDetailCacheEntry {
  detail: PropertyDetailDto;
  investments: PropertyInvestmentDto[];
}
