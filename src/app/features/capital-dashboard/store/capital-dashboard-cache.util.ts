import {
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundInvestorDto,
  FundListItemDto,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
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

export function capitalDashboardFundCommitmentsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  quarterYear: string,
): string {
  return `${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterYear}`;
}

export interface FundCommitmentsPageCacheEntry {
  items: FundCommitmentTabRow[];
  hasNextPage: boolean;
}

export function readFundCommitmentsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  quarterYear = '',
): FundCommitmentsPageCacheEntry | null {
  return cache[capitalDashboardFundCommitmentsCacheKey(fundKey, timeframe, page, quarterYear)] ?? null;
}

export function writeFundCommitmentsPageCache(
  cache: Record<string, FundCommitmentsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundCommitmentTabRow[],
  hasNextPage: boolean,
  quarterYear = '',
): Record<string, FundCommitmentsPageCacheEntry> {
  const key = capitalDashboardFundCommitmentsCacheKey(fundKey, timeframe, page, quarterYear);
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
  quarterYear: string,
): string {
  return `nav\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterYear}`;
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
  quarterYear = '',
): FundNavPageCacheEntry | null {
  return cache[capitalDashboardFundNavCacheKey(fundKey, timeframe, page, quarterYear)] ?? null;
}

export function writeFundNavPageCache(
  cache: Record<string, FundNavPageCacheEntry>,
  fundKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  items: FundNavTabRow[],
  hasNextPage: boolean,
  quarterYear = '',
): Record<string, FundNavPageCacheEntry> {
  const key = capitalDashboardFundNavCacheKey(fundKey, timeframe, page, quarterYear);
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
