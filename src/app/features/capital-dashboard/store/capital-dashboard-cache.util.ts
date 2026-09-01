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
  FundPeriodDto,
  InvestorDetailDto,
  InvestorCapitalActivityTabRow,
  InvestorDistributionTableTabRow,
  InvestorFundHoldingTabRow,
  AssetFundHoldingTabRow,
  AssetPropertyDetailTabRow,
  AssetTypeSummaryRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
  InvestorCapitalObligationTabRow,
  InvestorNetAssetTabRow,
  InvestorListItemDto,
  InvestorUnderlyingInvestmentTabRow,
  AssetsPagedResult,
  FundsPagedResult,
  InvestorsPagedResult,
  PagedResult,
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundInvestorTabRow } from '../shared/mappers/fund-investor.mapper';
import { AssetFinancialMetricsRow } from '../shared/mappers/asset-financial-metrics.mapper';
import { fundPeriodsCacheKey, FundPeriodSource } from '../shared/utils/fund-period.util';
import {
  AssetsListCacheEntry,
  AssetsPagedListState,
  FundsListCacheEntry,
  FundsPagedListState,
  InvestorsListCacheEntry,
  InvestorsPagedListState,
  PagedListState,
} from './capital-dashboard.state';
import { extractAssetsListSummary } from '../shared/utils/asset-list-row.util';
import { extractFundsListSummary } from '../shared/utils/fund-list-row.util';
import { extractInvestorsListSummary } from '../shared/utils/investor-list-row.util';
import { quarterlyTransactionPeriodCacheSegment } from '../shared/utils/quarterly-transaction-period.util';

type PagedItemsSource<T> = PagedResult<T> & { Items?: T[] | PagedResult<T> | null };

/** MatTable and list UIs require a plain array; APIs may return a paged wrapper. */
export function extractPagedItems<T>(value: T[] | PagedResult<T> | null | undefined): T[] {
  if (value == null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  const record = value as PagedItemsSource<T>;
  const nested = record.items ?? record.Items;
  if (Array.isArray(nested)) {
    return nested;
  }
  if (nested != null && typeof nested === 'object') {
    return extractPagedItems(nested as PagedResult<T>);
  }
  return [];
}

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
  page: number,
  search: string,
): string {
  return `assets\u0000${fundKey}\u0000${page}\u0000${search.trim().toLowerCase()}`;
}

export function capitalDashboardFundInvestorsCacheKey(
  fundKey: number,
  page: number,
  search: string,
): string {
  return `investors\u0000${fundKey}\u0000${page}\u0000${search.trim().toLowerCase()}`;
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

export interface FundDistributionsPageCacheEntry {
  items: FundDistributionGroupTabRow[];
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
  cache: Record<string, FundDistributionsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): FundDistributionsPageCacheEntry | null {
  return cache[capitalDashboardFundDistributionsCacheKey(fundKey, timeframe, page, dateKey)] ?? null;
}

export function writeFundDistributionsPageCache(
  cache: Record<string, FundDistributionsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundDistributionGroupTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, FundDistributionsPageCacheEntry> {
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

function investorGranularPageDateKeySegment(dateKey?: number): string {
  return dateKey != null ? String(dateKey) : '';
}

export function capitalDashboardInvestorFundsCacheKey(
  investorKey: number,
  page: number,
  search: string,
): string {
  return `inv-funds\u0000${investorKey}\u0000${page}\u0000${search.trim().toLowerCase()}`;
}

export interface InvestorFundsPageCacheEntry {
  items: InvestorInvestmentDto[];
  hasNextPage: boolean;
}

export function capitalDashboardInvestorPeriodsCacheKey(
  investorKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
): string {
  return `inv-periods\u0000${investorKey}\u0000${source}\u0000${view}`;
}

export interface InvestorPeriodsCacheEntry {
  items: FundPeriodDto[];
}

export function readInvestorPeriodsCache(
  cache: Record<string, InvestorPeriodsCacheEntry>,
  investorKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
): InvestorPeriodsCacheEntry | null {
  return cache[capitalDashboardInvestorPeriodsCacheKey(investorKey, source, view)] ?? null;
}

export function writeInvestorPeriodsCache(
  cache: Record<string, InvestorPeriodsCacheEntry>,
  investorKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
  items: FundPeriodDto[],
): Record<string, InvestorPeriodsCacheEntry> {
  const key = capitalDashboardInvestorPeriodsCacheKey(investorKey, source, view);
  return { ...cache, [key]: { items: [...items] } };
}

export function capitalDashboardInvestorCommitmentsCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `inv-commit\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${investorGranularPageDateKeySegment(dateKey)}`;
}

export interface InvestorAmountPageCacheEntry {
  items: FundAmountTabRow[];
  hasNextPage: boolean;
}

export function readInvestorCommitmentsPageCache(
  cache: Record<string, InvestorAmountPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): InvestorAmountPageCacheEntry | null {
  return cache[capitalDashboardInvestorCommitmentsCacheKey(investorKey, timeframe, page, dateKey)] ?? null;
}

export function writeInvestorCommitmentsPageCache(
  cache: Record<string, InvestorAmountPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundAmountTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, InvestorAmountPageCacheEntry> {
  const key = capitalDashboardInvestorCommitmentsCacheKey(investorKey, timeframe, page, dateKey);
  return { ...cache, [key]: { items: [...items], hasNextPage } };
}

export function capitalDashboardInvestorUnfundedCommitmentsCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `inv-unfunded\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${investorGranularPageDateKeySegment(dateKey)}`;
}

export function readInvestorUnfundedCommitmentsPageCache(
  cache: Record<string, InvestorAmountPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): InvestorAmountPageCacheEntry | null {
  return cache[capitalDashboardInvestorUnfundedCommitmentsCacheKey(investorKey, timeframe, page, dateKey)] ?? null;
}

export function writeInvestorUnfundedCommitmentsPageCache(
  cache: Record<string, InvestorAmountPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundAmountTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, InvestorAmountPageCacheEntry> {
  const key = capitalDashboardInvestorUnfundedCommitmentsCacheKey(investorKey, timeframe, page, dateKey);
  return { ...cache, [key]: { items: [...items], hasNextPage } };
}

export function capitalDashboardInvestorCapitalInvestmentsCacheKey(
  investorKey: number,
  page: number,
): string {
  return `inv-underlying-inv\u0000${investorKey}\u0000${page}`;
}

export interface InvestorCapitalInvestmentsPageCacheEntry {
  items: InvestorUnderlyingInvestmentTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorCapitalInvestmentsPageCache(
  cache: Record<string, InvestorCapitalInvestmentsPageCacheEntry>,
  investorKey: number,
  page: number,
): InvestorCapitalInvestmentsPageCacheEntry | null {
  return cache[capitalDashboardInvestorCapitalInvestmentsCacheKey(investorKey, page)] ?? null;
}

export function writeInvestorCapitalInvestmentsPageCache(
  cache: Record<string, InvestorCapitalInvestmentsPageCacheEntry>,
  investorKey: number,
  page: number,
  items: InvestorUnderlyingInvestmentTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
): Record<string, InvestorCapitalInvestmentsPageCacheEntry> {
  const key = capitalDashboardInvestorCapitalInvestmentsCacheKey(investorKey, page);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorDistributionsCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `inv-dist\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${investorGranularPageDateKeySegment(dateKey)}`;
}

export interface InvestorDistributionsPageCacheEntry {
  items: FundDistributionGroupTabRow[];
  hasNextPage: boolean;
}

export function readInvestorDistributionsPageCache(
  cache: Record<string, InvestorDistributionsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
): InvestorDistributionsPageCacheEntry | null {
  return cache[capitalDashboardInvestorDistributionsCacheKey(investorKey, timeframe, page, dateKey)] ?? null;
}

export function writeInvestorDistributionsPageCache(
  cache: Record<string, InvestorDistributionsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundDistributionGroupTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, InvestorDistributionsPageCacheEntry> {
  const key = capitalDashboardInvestorDistributionsCacheKey(investorKey, timeframe, page, dateKey);
  return { ...cache, [key]: { items: [...items], hasNextPage } };
}

export function capitalDashboardInvestorNavCacheKey(
  investorKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  dateKey?: number,
): string {
  return `inv-nav\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${investorGranularPageDateKeySegment(dateKey)}`;
}

export interface InvestorNavPageCacheEntry {
  items: FundNavTabRow[];
  hasNextPage: boolean;
}

export function readInvestorNavPageCache(
  cache: Record<string, InvestorNavPageCacheEntry>,
  investorKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  dateKey?: number,
): InvestorNavPageCacheEntry | null {
  return cache[capitalDashboardInvestorNavCacheKey(investorKey, timeframe, page, dateKey)] ?? null;
}

export function writeInvestorNavPageCache(
  cache: Record<string, InvestorNavPageCacheEntry>,
  investorKey: number,
  timeframe: FundNavTimeframe,
  page: number,
  items: FundNavTabRow[],
  hasNextPage: boolean,
  dateKey?: number,
): Record<string, InvestorNavPageCacheEntry> {
  const key = capitalDashboardInvestorNavCacheKey(investorKey, timeframe, page, dateKey);
  return { ...cache, [key]: { items: [...items], hasNextPage } };
}

function investorTransactionFundCodeSegment(fundCode?: string): string {
  return fundCode?.trim() || '';
}

export function capitalDashboardInvestorCapitalActivitiesCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): string {
  return `inv-cap-act\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${investorTransactionFundCodeSegment(fundCode)}`;
}

export interface InvestorCapitalActivitiesPageCacheEntry {
  items: InvestorCapitalActivityTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorCapitalActivitiesPageCache(
  cache: Record<string, InvestorCapitalActivitiesPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): InvestorCapitalActivitiesPageCacheEntry | null {
  return cache[capitalDashboardInvestorCapitalActivitiesCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear)] ?? null;
}

export function writeInvestorCapitalActivitiesPageCache(
  cache: Record<string, InvestorCapitalActivitiesPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: InvestorCapitalActivityTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): Record<string, InvestorCapitalActivitiesPageCacheEntry> {
  const key = capitalDashboardInvestorCapitalActivitiesCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorDistributionTableCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): string {
  return `inv-dist-tbl\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${investorTransactionFundCodeSegment(fundCode)}`;
}

export interface InvestorDistributionTablePageCacheEntry {
  items: InvestorDistributionTableTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorDistributionTablePageCache(
  cache: Record<string, InvestorDistributionTablePageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): InvestorDistributionTablePageCacheEntry | null {
  return cache[capitalDashboardInvestorDistributionTableCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear)] ?? null;
}

export function writeInvestorDistributionTablePageCache(
  cache: Record<string, InvestorDistributionTablePageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: InvestorDistributionTableTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): Record<string, InvestorDistributionTablePageCacheEntry> {
  const key = capitalDashboardInvestorDistributionTableCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorIrrCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): string {
  return `inv-irr\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${investorTransactionFundCodeSegment(fundCode)}`;
}

export interface InvestorIrrPageCacheEntry {
  items: InvestorIrrTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorIrrPageCache(
  cache: Record<string, InvestorIrrPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): InvestorIrrPageCacheEntry | null {
  return cache[capitalDashboardInvestorIrrCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear)] ?? null;
}

export function writeInvestorIrrPageCache(
  cache: Record<string, InvestorIrrPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: InvestorIrrTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): Record<string, InvestorIrrPageCacheEntry> {
  const key = capitalDashboardInvestorIrrCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorCapitalObligationsCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): string {
  return `inv-capital-obligations\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${investorTransactionFundCodeSegment(fundCode)}`;
}

export interface InvestorCapitalObligationsPageCacheEntry {
  items: InvestorCapitalObligationTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorCapitalObligationsPageCache(
  cache: Record<string, InvestorCapitalObligationsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): InvestorCapitalObligationsPageCacheEntry | null {
  return cache[capitalDashboardInvestorCapitalObligationsCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear)] ?? null;
}

export function writeInvestorCapitalObligationsPageCache(
  cache: Record<string, InvestorCapitalObligationsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: InvestorCapitalObligationTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): Record<string, InvestorCapitalObligationsPageCacheEntry> {
  const key = capitalDashboardInvestorCapitalObligationsCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorNetAssetsCacheKey(
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): string {
  return `inv-net-assets\u0000${investorKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${investorTransactionFundCodeSegment(fundCode)}`;
}

export interface InvestorNetAssetsPageCacheEntry {
  items: InvestorNetAssetTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readInvestorNetAssetsPageCache(
  cache: Record<string, InvestorNetAssetsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): InvestorNetAssetsPageCacheEntry | null {
  return cache[capitalDashboardInvestorNetAssetsCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear)] ?? null;
}

export function writeInvestorNetAssetsPageCache(
  cache: Record<string, InvestorNetAssetsPageCacheEntry>,
  investorKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: InvestorNetAssetTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  fundCode?: string,
  calendarYear?: number,
): Record<string, InvestorNetAssetsPageCacheEntry> {
  const key = capitalDashboardInvestorNetAssetsCacheKey(investorKey, timeframe, page, dateKey, fundCode, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardInvestorFundHoldingsCacheKey(investorKey: number): string {
  return `inv-fund-holdings\u0000${investorKey}`;
}

export interface InvestorFundHoldingsCacheEntry {
  items: InvestorFundHoldingTabRow[];
  dateKey: number | null;
}

export function readInvestorFundHoldingsCache(
  cache: Record<string, InvestorFundHoldingsCacheEntry>,
  investorKey: number,
): InvestorFundHoldingsCacheEntry | null {
  return cache[capitalDashboardInvestorFundHoldingsCacheKey(investorKey)] ?? null;
}

export function writeInvestorFundHoldingsCache(
  cache: Record<string, InvestorFundHoldingsCacheEntry>,
  investorKey: number,
  items: InvestorFundHoldingTabRow[],
  dateKey: number | null,
): Record<string, InvestorFundHoldingsCacheEntry> {
  const key = capitalDashboardInvestorFundHoldingsCacheKey(investorKey);
  return {
    ...cache,
    [key]: {
      items,
      dateKey,
    },
  };
}

function fundTransactionInvestorNameSegment(investorName?: string): string {
  return investorName?.trim() || '';
}

export function capitalDashboardFundCapitalActivitiesCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): string {
  return `fund-cap-act\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${fundTransactionInvestorNameSegment(investorName)}`;
}

export interface FundCapitalActivitiesPageCacheEntry {
  items: FundInvestorCapitalActivityTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readFundCapitalActivitiesPageCache(
  cache: Record<string, FundCapitalActivitiesPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): FundCapitalActivitiesPageCacheEntry | null {
  return cache[capitalDashboardFundCapitalActivitiesCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear)] ?? null;
}

export function writeFundCapitalActivitiesPageCache(
  cache: Record<string, FundCapitalActivitiesPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundInvestorCapitalActivityTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): Record<string, FundCapitalActivitiesPageCacheEntry> {
  const key = capitalDashboardFundCapitalActivitiesCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardFundDistributionTableCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): string {
  return `fund-dist-tbl\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${fundTransactionInvestorNameSegment(investorName)}`;
}

export interface FundDistributionTablePageCacheEntry {
  items: FundInvestorDistributionTableTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readFundDistributionTablePageCache(
  cache: Record<string, FundDistributionTablePageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): FundDistributionTablePageCacheEntry | null {
  return cache[capitalDashboardFundDistributionTableCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear)] ?? null;
}

export function writeFundDistributionTablePageCache(
  cache: Record<string, FundDistributionTablePageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundInvestorDistributionTableTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): Record<string, FundDistributionTablePageCacheEntry> {
  const key = capitalDashboardFundDistributionTableCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardFundIrrCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): string {
  return `fund-irr\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${fundTransactionInvestorNameSegment(investorName)}`;
}

export interface FundIrrPageCacheEntry {
  items: FundInvestorIrrTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readFundIrrPageCache(
  cache: Record<string, FundIrrPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): FundIrrPageCacheEntry | null {
  return cache[capitalDashboardFundIrrCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear)] ?? null;
}

export function writeFundIrrPageCache(
  cache: Record<string, FundIrrPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundInvestorIrrTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): Record<string, FundIrrPageCacheEntry> {
  const key = capitalDashboardFundIrrCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardFundCapitalObligationsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): string {
  return `fund-capital-obligations\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${fundTransactionInvestorNameSegment(investorName)}`;
}

export interface FundCapitalObligationsPageCacheEntry {
  items: FundInvestorCapitalObligationTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readFundCapitalObligationsPageCache(
  cache: Record<string, FundCapitalObligationsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): FundCapitalObligationsPageCacheEntry | null {
  return cache[capitalDashboardFundCapitalObligationsCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear)] ?? null;
}

export function writeFundCapitalObligationsPageCache(
  cache: Record<string, FundCapitalObligationsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundInvestorCapitalObligationTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): Record<string, FundCapitalObligationsPageCacheEntry> {
  const key = capitalDashboardFundCapitalObligationsCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function capitalDashboardFundNetAssetsCacheKey(
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): string {
  return `fund-net-assets\u0000${fundKey}\u0000${timeframe}\u0000${page}\u0000${quarterlyTransactionPeriodCacheSegment(dateKey, calendarYear)}\u0000${fundTransactionInvestorNameSegment(investorName)}`;
}

export interface FundNetAssetsPageCacheEntry {
  items: FundInvestorNetAssetTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function readFundNetAssetsPageCache(
  cache: Record<string, FundNetAssetsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): FundNetAssetsPageCacheEntry | null {
  return cache[capitalDashboardFundNetAssetsCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear)] ?? null;
}

export function writeFundNetAssetsPageCache(
  cache: Record<string, FundNetAssetsPageCacheEntry>,
  fundKey: number,
  timeframe: FundCommitmentTimeframe,
  page: number,
  items: FundInvestorNetAssetTabRow[],
  pageSize: number,
  totalCount: number,
  totalPages: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  dateKey?: number,
  investorName?: string,
  calendarYear?: number,
): Record<string, FundNetAssetsPageCacheEntry> {
  const key = capitalDashboardFundNetAssetsCacheKey(fundKey, timeframe, page, dateKey, investorName, calendarYear);
  return {
    ...cache,
    [key]: {
      items: [...items],
      pageSize,
      totalCount,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    },
  };
}

export function readListCacheEntry<T>(
  cache: Record<string, ListCacheEntry<T>>,
  search: string,
  page: number,
  scope = '',
): ListCacheEntry<T> | null {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return cache[key] ?? null;
}

export function readInvestorsListCacheEntry(
  cache: Record<string, InvestorsListCacheEntry>,
  search: string,
  page: number,
  scope = '',
): InvestorsListCacheEntry | null {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return cache[key] ?? null;
}

export function writeListCacheEntry<T>(
  cache: Record<string, ListCacheEntry<T>>,
  search: string,
  result: PagedResult<T>,
  page: number,
  scope = '',
): Record<string, ListCacheEntry<T>> {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return {
    ...cache,
    [key]: {
      items: [...extractPagedItems(result)],
      page: result.page ?? page,
      totalCount: result.totalCount ?? 0,
      hasNextPage: !!result.hasNextPage,
    },
  };
}

export function writeInvestorsListCacheEntry(
  cache: Record<string, InvestorsListCacheEntry>,
  search: string,
  result: InvestorsPagedResult,
  page: number,
  scope = '',
): Record<string, InvestorsListCacheEntry> {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return {
    ...cache,
    [key]: {
      items: [...extractPagedItems(result)],
      page: result.page ?? page,
      totalCount: result.totalCount ?? 0,
      hasNextPage: !!result.hasNextPage,
      summary: extractInvestorsListSummary(result),
    },
  };
}

export function listStateFromCacheEntry<T>(
  search: string,
  entry: ListCacheEntry<T>,
  listScope = '',
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
    listScope,
  };
}

export function investorsListStateFromCacheEntry(
  search: string,
  entry: InvestorsListCacheEntry,
  listScope = '',
): InvestorsPagedListState {
  return {
    ...listStateFromCacheEntry(search, entry, listScope),
    summary: entry.summary,
  };
}

export function readFundsListCacheEntry(
  cache: Record<string, FundsListCacheEntry>,
  search: string,
  page: number,
  scope = '',
): FundsListCacheEntry | null {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return cache[key] ?? null;
}

export function writeFundsListCacheEntry(
  cache: Record<string, FundsListCacheEntry>,
  search: string,
  result: FundsPagedResult,
  page: number,
  scope = '',
): Record<string, FundsListCacheEntry> {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return {
    ...cache,
    [key]: {
      items: [...extractPagedItems(result)],
      page: result.page ?? page,
      totalCount: result.totalCount ?? 0,
      hasNextPage: !!result.hasNextPage,
      summary: extractFundsListSummary(result),
    },
  };
}

export function fundsListStateFromCacheEntry(
  search: string,
  entry: FundsListCacheEntry,
  listScope = '',
): FundsPagedListState {
  return {
    ...listStateFromCacheEntry(search, entry, listScope),
    summary: entry.summary,
  };
}

export function readAssetsListCacheEntry(
  cache: Record<string, AssetsListCacheEntry>,
  search: string,
  page: number,
  scope = '',
): AssetsListCacheEntry | null {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return cache[key] ?? null;
}

export function writeAssetsListCacheEntry(
  cache: Record<string, AssetsListCacheEntry>,
  search: string,
  result: AssetsPagedResult,
  page: number,
  scope = '',
): Record<string, AssetsListCacheEntry> {
  const key = scope
    ? capitalDashboardListCacheKey(`${scope}\u0001${search}`, page)
    : capitalDashboardListCacheKey(search, page);
  return {
    ...cache,
    [key]: {
      items: [...extractPagedItems(result)],
      page: result.page ?? page,
      totalCount: result.totalCount ?? 0,
      hasNextPage: !!result.hasNextPage,
      summary: extractAssetsListSummary(result),
    },
  };
}

export function assetsListStateFromCacheEntry(
  search: string,
  entry: AssetsListCacheEntry,
  listScope = '',
): AssetsPagedListState {
  return {
    ...listStateFromCacheEntry(search, entry, listScope),
    summary: entry.summary,
  };
}

export interface InvestorDetailCacheEntry {
  detail: InvestorDetailDto;
  investments: InvestorInvestmentDto[];
  investmentsPage: number;
  investmentsHasNextPage: boolean;
}

export interface FundDetailCacheEntry {
  detail: FundDetailDto;
  assets: FundAssetTabRow[];
  assetsPage: number;
  assetsHasNextPage: boolean;
  fundInvestors: FundInvestorTabRow[];
  fundInvestorsPage: number;
  fundInvestorsHasNextPage: boolean;
}

export interface FundAssetsPageCacheEntry {
  items: FundAssetTabRow[];
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface FundInvestorsPageCacheEntry {
  items: FundInvestorTabRow[];
  hasNextPage: boolean;
}

export interface AssetDetailCacheEntry {
  detail: PropertyDetailDto;
  leasingSummary: PropertyLeasingSummaryDto | null;
  propertyDetails: AssetPropertyDetailTabRow[];
  assetTypeSummary: AssetTypeSummaryRow[];
  financialMetrics: AssetFinancialMetricsRow | null;
}

export function capitalDashboardAssetFundHoldingsCacheKey(propertyKey: number): string {
  return `asset-fund-holdings\u0000${propertyKey}`;
}

export interface AssetFundHoldingsCacheEntry {
  items: AssetFundHoldingTabRow[];
}

export function readAssetFundHoldingsCache(
  cache: Record<string, AssetFundHoldingsCacheEntry>,
  propertyKey: number,
): AssetFundHoldingsCacheEntry | null {
  return cache[capitalDashboardAssetFundHoldingsCacheKey(propertyKey)] ?? null;
}

export function writeAssetFundHoldingsCache(
  cache: Record<string, AssetFundHoldingsCacheEntry>,
  propertyKey: number,
  items: AssetFundHoldingTabRow[],
): Record<string, AssetFundHoldingsCacheEntry> {
  const key = capitalDashboardAssetFundHoldingsCacheKey(propertyKey);
  return {
    ...cache,
    [key]: { items: [...items] },
  };
}
