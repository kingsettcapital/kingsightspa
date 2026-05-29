import {
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
