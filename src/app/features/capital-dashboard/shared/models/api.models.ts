export interface PagedResult<T> {
  items: T[] | null;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ListQueryParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetsQueryParams extends ListQueryParams {
  fundKey?: number;
  investorKey?: number;
  /** Filter assets by fund code (Kingsight API query param). */
  fundCode?: string;
}

export interface DynamicFieldDto {
  key: string | null;
  value?: unknown;
  formatType?: string | null;
}

export interface DynamicSectionDto {
  title: string | null;
  fields: DynamicFieldDto[] | null;
}

export interface InvestorListItemDto {
  investorKey: number;
  investorName: string | null;
  investorType: string | null;
  totalInvested: number;
}

export interface InvestorSummaryDto {
  investorKey: number;
  investorId: number;
  investorName: string | null;
  investorType: string | null;
  status: string | null;
  totalInvested: number;
  investmentsCount: number;
  documentsCount: number;
  joinYear: number | null;
}

export interface InvestorDetailDto {
  summary: InvestorSummaryDto;
  contactInformation: DynamicFieldDto[] | null;
  portfolioSummary: DynamicFieldDto[] | null;
  sections?: DynamicSectionDto[] | null;
}

export interface InvestorInvestmentDto {
  fundKey: number;
  fundName: string | null;
  fundType: string | null;
  fundCategory: string | null;
  status: string | null;
  investedAmount: number;
  investedAmountFmv: number;
  totalReturnPercent: number | null;
}

export interface FundListItemDto {
  fundKey: number;
  fundName: string | null;
  category: string | null;
  currentValue: number;
  totalReturnPercent: number | null;
}

export interface FundSummaryDto {
  fundKey: number;
  fundId: number;
  fundCode: string | null;
  fundName: string | null;
  fundType: string | null;
  status: string | null;
  currentValue: number;
  totalReturnPercent: number | null;
  assets: number;
  investors: number;
}

export interface FundDetailDto {
  summary: FundSummaryDto;
  investmentDetails: DynamicFieldDto[] | null;
  financialSummary: DynamicFieldDto[] | null;
  sections?: DynamicSectionDto[] | null;
}

export interface FundInvestorDto {
  investorKey: number;
  investorName: string | null;
  relationship_name?: string | null;
  investorType: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  totalInvested: number;
  totalInvestedFmv: number;
  totalReturnPercent?: number | null;
  status: string | null;
  memberSince: string | null;
  joinYear: number | null;
}

/** UI / store timeframe keys (mat-button-toggle values). */
export type FundCommitmentTimeframe = 'ltd' | 'quarterly' | 'daily';

/** API `view` / `TimeGranularity` query param (lowercase per OpenAPI). */
export type FundTimeGranularity = FundCommitmentTimeframe;

export function fundTimeGranularityFromTimeframe(timeframe: FundCommitmentTimeframe): FundTimeGranularity {
  return timeframe;
}

/** @deprecated Use FundTimeGranularity */
export type FundCommitmentsView = FundTimeGranularity;

/** @deprecated Use fundTimeGranularityFromTimeframe */
export const fundCommitmentsViewFromTimeframe = fundTimeGranularityFromTimeframe;

export interface FundFundamentalQueryParams {
  view: FundTimeGranularity;
  page?: number;
  pageSize?: number;
  dateKey?: number;
}

export interface FundCommitmentsQueryParams extends FundFundamentalQueryParams {}

export interface FundPeriodDto {
  date_key?: number | null;
  dateKey?: number | null;
  full_date?: string | null;
  fullDate?: string | null;
  label?: string | null;
  disabled?: boolean;
  quarter_year?: string | null;
  quarterYear?: string | null;
  calendar_year?: number;
  calendarYear?: number;
  month_year?: string | null;
  monthYear?: string | null;
  period_start?: string | null;
  periodStart?: string | null;
  period_end?: string | null;
  periodEnd?: string | null;
}

export type FundPeriodSource =
  | 'commitments'
  | 'nav'
  | 'unfunded-commitments'
  | 'investments'
  | 'distributions';

export interface FundPeriodsQueryParams {
  view: FundTimeGranularity;
  source: FundPeriodSource;
  page?: number;
  pageSize?: number;
}

export interface FundInvestmentsQueryParams extends FundFundamentalQueryParams {}

export interface FundDistributionsQueryParams extends FundFundamentalQueryParams {}

/** Granular row returned by fund detail tabs (commitments, investments, distributions, etc.). */
export interface FundGranularRowDto {
  fund_code?: string | null;
  period?: string | null;
  date?: string | null;
  posted_date_key?: number | null;
  postedDateKey?: number | null;
  amount?: number | null;
  /** Commitments rows */
  commitment_amount?: number | null;
  /** Investments LTD/quarterly/daily rows */
  invested_amount?: number | null;
  /** Distributions rows */
  distributed_amount?: number | null;
  units?: number | null;
  description?: string | null;
}

/** LTD / quarterly commitment row */
export interface FundCommitmentPeriodDto {
  period: string;
  amount: number;
  units: number;
  description: string;
}

/** Daily commitment row */
export interface FundCommitmentDailyDto {
  fund_key?: number;
  posted_date_key?: number;
  date: string;
  amount: number;
  units: number;
  description: string;
}

export type FundCommitmentDto = FundCommitmentPeriodDto | FundCommitmentDailyDto | FundGranularRowDto;

/** GET api/Funds/{fundKey}/assets */
export interface FundAssetDto {
  propertyKey?: number;
  property_name?: string | null;
  city?: string | null;
  province?: string | null;
  geography?: string | null;
  asset_type?: string | null;
  investment_type?: string | null;
  property_status?: string | null;
  property_acquisition?: string | null;
  property_disposition?: string | null;
}

/** Fund assets tab row (mapped from FundAssetDto). */
export interface FundAssetTabRow {
  propertyKey: number | null;
  assetName: string;
  city: string;
  province: string;
  geography: string;
  assetType: string;
  investmentType: string;
  propertyStatus: string;
  propertyAcquisition: string;
  propertyDisposedDate: string;
}

/** Tab row for commitments, unfunded commitments, and NAV (amount only). */
export interface FundAmountTabRow {
  fundCode?: string;
  period?: string;
  date?: string;
  amount: number;
  description: string;
}

/** Tab row for investments and distributions (amount or units by fund type). */
export interface FundCommitmentTabRow extends FundAmountTabRow {
  units: string;
}

/** Period line inside a fund distributions transaction-type group. */
export interface FundDistributionPeriodRowDto {
  period?: string | null;
  date?: string | null;
  posted_date_key?: number | null;
  amount?: number | null;
  units?: number | null;
  description?: string | null;
}

/** GET api/Funds/{fundKey}/distributions — grouped by transaction_type. */
export interface FundDistributionGroupDto {
  fund_code?: string | null;
  investor_code?: string | null;
  transaction_type?: string | null;
  periods?: FundDistributionPeriodRowDto[] | null;
  total_amount?: number | null;
  total_units?: number | null;
}

/** Mapped period row for distributions tab detail rows. */
export interface FundDistributionPeriodTabRow {
  period?: string;
  date?: string;
  amount: number;
  units: string;
  description: string;
}

/** Mapped group row for distributions tab. */
export interface FundDistributionGroupTabRow {
  groupKey: string;
  transactionType: string;
  totalAmount: number;
  totalUnits: string;
  periods: FundDistributionPeriodTabRow[];
}

/** UI timeframe for fund NAV tab (same values as commitments). */
export type FundNavTimeframe = FundCommitmentTimeframe;

/** API `view` query param for GET api/Funds/{fundKey}/nav */
export type FundNavView = FundCommitmentsView;

export const fundNavViewFromTimeframe = fundCommitmentsViewFromTimeframe;

export interface FundNavQueryParams extends FundFundamentalQueryParams {}

export interface FundUnfundedCommitmentsQueryParams extends FundFundamentalQueryParams {}

export type FundNavPeriodDto = FundCommitmentPeriodDto;
export type FundNavDailyDto = FundCommitmentDailyDto;
export type FundNavDto = FundCommitmentDto;

export type FundNavTabRow = FundAmountTabRow;

export interface PropertyListItemDto {
  propertyKey: number;
  propertyName: string | null;
  city: string | null;
  province: string | null;
  assetType: string | null;
  status: string | null;
  ownership?: boolean | null;
  currentValue: number;
  yieldPercent: number | null;
}

export interface PropertySummaryDto {
  propertyKey?: number;
  propertyName?: string | null;
  acquisitionDate?: string | null;
  assetType?: string | null;
  currentValue?: number;
  /** API summary field for associated investment count */
  investments?: number;
  investmentsCount?: number;
  location?: string | null;
  city?: string | null;
  province?: string | null;
  status?: string | null;
  yield?: number | null;
  yieldPercent?: number | null;
}

export interface PropertyDetailDto {
  propertyKey?: number;
  investmentsCount?: number;
  fields?: Record<string, unknown> | null;
  summary?: PropertySummaryDto | null;
  sections?: DynamicSectionDto[] | null;
}

export interface PropertyInvestmentDto {
  fundKey: number;
  fundName: string | null;
  fundType: string | null;
  fundStrategy: string | null;
  status: string | null;
  fundStartDate: string | null;
  totalValue: number;
  totalReturnPercent: number | null;
}

