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

export interface InvestorsFilterOptionDto {
  value: string;
  label: string;
}

export interface InvestorsQuarterlyPeriodDto {
  date_key?: number;
  dateKey?: number;
  calendar_year?: number;
  calendarYear?: number;
  quarter: number;
  label: string;
  quarter_year?: string;
  quarterYear?: string;
}

export interface InvestorsFilterOptionsDto {
  investor_types?: InvestorsFilterOptionDto[] | null;
  investorTypes?: InvestorsFilterOptionDto[] | null;
  relationships?: InvestorsFilterOptionDto[] | null;
  calendar_years?: InvestorsFilterOptionDto[] | null;
  calendarYears?: InvestorsFilterOptionDto[] | null;
  quarterly_periods?: InvestorsQuarterlyPeriodDto[] | null;
  quarterlyPeriods?: InvestorsQuarterlyPeriodDto[] | null;
}

export interface InvestorsListQueryParams extends ListQueryParams {
  view?: 'ltd' | 'quarterly' | 'daily';
  dateKey?: number;
  investorType?: string;
  relationship?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface InvestorsListSummaryDto {
  totalInvestors?: number;
  totalCommitment?: number;
  netInvestedCapital?: number;
  netDistributed?: number;
  reservedUncalled?: number;
  unfunded?: number;
  releasedCapital?: number;
}

export interface AssetsFilterOptionDto {
  value: string;
  label: string;
}

export interface AssetsFilterOptionsDto {
  asset_types?: AssetsFilterOptionDto[] | null;
  assetTypes?: AssetsFilterOptionDto[] | null;
  investment_types?: AssetsFilterOptionDto[] | null;
  investmentTypes?: AssetsFilterOptionDto[] | null;
  geographies?: AssetsFilterOptionDto[] | null;
  statuses?: AssetsFilterOptionDto[] | null;
  quarterly_periods?: InvestorsQuarterlyPeriodDto[] | null;
  quarterlyPeriods?: InvestorsQuarterlyPeriodDto[] | null;
}

export interface AssetsQueryParams extends ListQueryParams {
  view?: 'ltd' | 'quarterly';
  dateKey?: number;
  fundKey?: number;
  investorKey?: number;
  fundCode?: string;
  assetType?: string;
  investmentType?: string;
  geography?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface AssetsListSummaryDto {
  totalGla?: number;
  activeProperties?: number;
  totalProperties?: number;
  totalCommittedArea?: number;
  totalVacantArea?: number;
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
  relationshipName?: string | null;
  fundsCount?: number | null;
  commitment?: number | null;
  netInvestedCapital?: number | null;
  netDistributed?: number | null;
  reservedUncalled?: number | null;
  unfunded?: number | null;
  releasedCapital?: number | null;
  contactName?: string | null;
  addressLine1?: string | null;
  address_line1?: string | null;
  addressLine2?: string | null;
  address_line2?: string | null;
  city?: string | null;
  province?: string | null;
  provinceCode?: string | null;
  province_code?: string | null;
}

export interface InvestorsPagedResult extends PagedResult<InvestorListItemDto> {
  summary?: InvestorsListSummaryDto | null;
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
  relationship_name?: string | null;
  relationshipName?: string | null;
  contact_first_name?: string | null;
  contactFirstName?: string | null;
  contact_last_name?: string | null;
  contactLastName?: string | null;
  contact_email?: string | null;
  contactEmail?: string | null;
  address_line1?: string | null;
  addressLine1?: string | null;
  address_line2?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  provinceCode?: string | null;
}

export interface InvestorDetailFundDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  fund_type?: string | null;
  fundType?: string | null;
  fund_type_name?: string | null;
  fundTypeName?: string | null;
}

/** GET api/CapitalInvestors/{investorKey} */
export interface InvestorDetailDto {
  investor_name?: string | null;
  investorName?: string | null;
  investor_type?: string | null;
  investorType?: string | null;
  relationship?: string | null;
  status?: string | null;
  contact?: string | null;
  address_line1?: string | null;
  addressLine1?: string | null;
  address_line2?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  province_code?: string | null;
  provinceCode?: string | null;
  total_commitment?: number | null;
  totalCommitment?: number | null;
  net_invested_capital?: number | null;
  netInvestedCapital?: number | null;
  net_distributed?: number | null;
  netDistributed?: number | null;
  reserved_uncalled?: number | null;
  reservedUncalled?: number | null;
  released_capital?: number | null;
  releasedCapital?: number | null;
  fund_count?: number | null;
  fundCount?: number | null;
  funds?: InvestorDetailFundDto[] | null;
  capital_deployed?: number | null;
  capitalDeployed?: number | null;
  tvpi?: number | null;
  TVPI?: number | null;
  dpi?: number | null;
  DPI?: number | null;
  /** Legacy nested payload (optional). */
  summary?: InvestorSummaryDto;
  contactInformation?: DynamicFieldDto[] | null;
  portfolioSummary?: DynamicFieldDto[] | null;
  sections?: DynamicSectionDto[] | null;
}

export interface InvestorInvestmentDto {
  fundKey: number;
  fund_code?: string | null;
  fundCode?: string | null;
  fundName: string | null;
  fundType: string | null;
  fundCategory: string | null;
  status: string | null;
  investedAmount: number;
  investedAmountFmv: number;
  totalReturnPercent: number | null;
}

export interface FundsFilterOptionDto {
  value: string;
  label: string;
}

export interface FundsQuarterlyPeriodDto {
  date_key?: number;
  dateKey?: number;
  calendar_year?: number;
  calendarYear?: number;
  quarter: number;
  label: string;
  quarter_year?: string;
  quarterYear?: string;
}

export interface FundsFilterOptionsDto {
  fund_types?: FundsFilterOptionDto[] | null;
  fundTypes?: FundsFilterOptionDto[] | null;
  strategies?: FundsFilterOptionDto[] | null;
  calendar_years?: FundsFilterOptionDto[] | null;
  calendarYears?: FundsFilterOptionDto[] | null;
  quarterly_periods?: FundsQuarterlyPeriodDto[] | null;
  quarterlyPeriods?: FundsQuarterlyPeriodDto[] | null;
}

export interface FundsListQueryParams extends ListQueryParams {
  view?: 'ltd' | 'quarterly' | 'daily';
  dateKey?: number;
  fundType?: string;
  strategy?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface FundsListSummaryDto {
  totalFunds?: number;
  totalCommitment?: number;
  netInvestedCapital?: number;
  netDistributed?: number;
  reservedUncalled?: number;
  unfunded?: number;
}

export interface FundListItemDto {
  fundKey: number;
  fundName: string | null;
  category: string | null;
  currentValue: number;
  totalReturnPercent: number | null;
  fundType?: string | null;
  strategy?: string | null;
  fundStrategyName?: string | null;
  commitment?: number | null;
  commitmentAmount?: number | null;
  investedPercent?: number | null;
  netInvestedCapital?: number | null;
  netDistributed?: number | null;
  reservedUncalled?: number | null;
  unfunded_amount?: number | null;
  unfundedAmount?: number | null;
  unfunded?: number | null;
  releasedCapital?: number | null;
}

export interface FundsPagedResult extends PagedResult<FundListItemDto> {
  summary?: FundsListSummaryDto | null;
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

/** GET api/Funds/{fundKey} — flat response and legacy nested payload. */
export interface FundDetailDto {
  summary?: FundSummaryDto;
  investmentDetails?: DynamicFieldDto[] | null;
  financialSummary?: DynamicFieldDto[] | null;
  sections?: DynamicSectionDto[] | null;
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  fund_type?: string | null;
  fundType?: string | null;
  strategy?: string | null;
  status?: string | null;
  start_date?: string | null;
  startDate?: string | null;
  is_sidecar?: boolean | null;
  isSidecar?: boolean | null;
  total_commitment?: number | null;
  totalCommitment?: number | null;
  net_invested_capital?: number | null;
  netInvestedCapital?: number | null;
  net_distributed?: number | null;
  netDistributed?: number | null;
  reserved_uncalled?: number | null;
  reservedUncalled?: number | null;
  released_capital?: number | null;
  releasedCapital?: number | null;
  capital_deployed?: number | null;
  capitalDeployed?: number | null;
  tvpi?: number | null;
  TVPI?: number | null;
  dpi?: number | null;
  DPI?: number | null;
  rvpi?: number | null;
  RVPI?: number | null;
  investor_count?: number | null;
  investorCount?: number | null;
  asset_count?: number | null;
  assetCount?: number | null;
  investors?: FundDetailInvestorRefDto[] | null;
}

export interface FundDetailInvestorRefDto {
  investor_key?: number | null;
  investorKey?: number | null;
  investor_name?: string | null;
  investorName?: string | null;
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
  findcode?: string | null;
  findCode?: string | null;
}

/** GET api/CapitalInvestors/{investorKey}/underlying-assets — dbo.view_investor_fund_asset (is_current = 1) */
export interface InvestorUnderlyingInvestmentDto {
  property_name?: string | null;
  propertyName?: string | null;
  city?: string | null;
  province?: string | null;
  geography?: string | null;
  asset_type?: string | null;
  assetType?: string | null;
  asset_sub_type?: string | null;
  assetSubType?: string | null;
  investment_type?: string | null;
  investmentType?: string | null;
}

export interface InvestorUnderlyingInvestmentTabRow {
  propertyName: string;
  city: string;
  province: string;
  geography: string;
  assetType: string;
  assetSubType: string;
  investmentType: string;
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

/** GET api/Funds/{fundKey}/underlying-assets */
export interface FundAssetDto {
  propertyKey?: number;
  property_name?: string | null;
  city?: string | null;
  province?: string | null;
  geography?: string | null;
  asset_type?: string | null;
  asset_sub_type?: string | null;
  assetSubType?: string | null;
  investment_type?: string | null;
  property_status?: string | null;
  property_acquisition?: string | null;
  property_disposition?: string | null;
  gla_sf?: number | null;
  occupancy_pct?: number | null;
  market_value?: number | null;
  cap_rate?: number | null;
  status?: string | null;
}

/** Fund underlying-assets tab row (mapped from FundAssetDto). */
export interface FundAssetTabRow {
  propertyKey: number | null;
  assetName: string;
  city: string;
  province: string;
  geography: string;
  assetType: string;
  assetSubType: string;
  investmentType: string;
  propertyStatus: string;
  propertyDisposition: string;
  propertyAcquisition: string;
  glaSf: number | null;
  occupancyPct: number | null;
  marketValue: number | null;
  capRate: number | null;
  status: string;
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
  fundCode: string;
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

/** GET api/CapitalInvestors/{investorKey}/capital-activities */
export interface InvestorCapitalActivityDto {
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  called?: number | null;
  transfer_in?: number | null;
  transferIn?: number | null;
  transfer_out?: number | null;
  transferOut?: number | null;
  redemption?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface InvestorCapitalActivityTabRow {
  fundCode: string;
  fundName: string;
  type: string;
  period: string;
  called: number;
  transferIn: number;
  transferOut: number;
  redemption: number;
}

/** GET api/CapitalInvestors/{investorKey}/fund-holdings */
export interface InvestorFundHoldingDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  fund_type?: string | null;
  fundType?: string | null;
  fund_type_name?: string | null;
  fundTypeName?: string | null;
  since?: string | null;
  commitment?: number | null;
  unfunded?: number | null;
  net_invested?: number | null;
  netInvested?: number | null;
  net_invested_capital?: number | null;
  netInvestedCapital?: number | null;
  distributed?: number | null;
  net_distributed?: number | null;
  netDistributed?: number | null;
  reserved?: number | null;
  reserved_uncalled?: number | null;
  reservedUncalled?: number | null;
  released?: number | null;
  released_capital?: number | null;
  releasedCapital?: number | null;
}

export interface InvestorFundHoldingsResponseDto {
  date_key?: number | null;
  dateKey?: number | null;
  items?: InvestorFundHoldingDto[] | null;
}

export interface InvestorFundHoldingTabRow {
  fundKey: number;
  fundCode: string;
  fundName: string;
  fundType: string;
  since: string;
  commitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  unfunded: number;
  releasedCapital: number;
}

/** @deprecated Fund holdings no longer accepts query params. */
export interface InvestorFundHoldingsQueryParams {
  sinceStart?: string;
  sinceEnd?: string;
  page?: number;
  pageSize?: number;
}

/** GET api/CapitalInvestors/{investorKey}/distributions-table */
export interface InvestorDistributionTableDto {
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  committed?: number | null;
  unfunded?: number | null;
  cash_dist?: number | null;
  cashDist?: number | null;
  gain_dist?: number | null;
  gainDist?: number | null;
  preferred_return?: number | null;
  preferredReturn?: number | null;
  return_of_capital?: number | null;
  returnOfCapital?: number | null;
  released?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface InvestorDistributionTableTabRow {
  fundCode: string;
  fundName: string;
  type: string;
  period: string;
  committed: number;
  unfunded: number;
  cashDist: number;
  gainDist: number;
  preferredReturn: number;
  returnOfCapital: number;
  released: number;
}

/** GET api/CapitalInvestors/{investorKey}/irr */
export interface InvestorIrrDto {
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  irr_1_year_pct?: number | null;
  irr_3_year_pct?: number | null;
  irr_5_year_pct?: number | null;
  irr_7_year_pct?: number | null;
  irr_10_year_pct?: number | null;
  irr_ltd_pct?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface InvestorIrrTabRow {
  fundCode: string;
  fundName: string;
  type: string;
  period: string;
  irr1Year: number | null;
  irr3Year: number | null;
  irr5Year: number | null;
  irr7Year: number | null;
  irr10Year: number | null;
  irrLtd: number | null;
}

/** GET api/CapitalInvestors/{investorKey}/capital-obligations */
export interface InvestorCapitalObligationDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  quarter_year?: string | null;
  quarterYear?: string | null;
  period?: string | null;
  commitment_amount?: number | null;
  commitmentAmount?: number | null;
  unfunded_amount?: number | null;
  unfundedAmount?: number | null;
  reserved_amount?: number | null;
  reservedAmount?: number | null;
  released_capital_amount?: number | null;
  releasedCapitalAmount?: number | null;
}

export interface InvestorCapitalObligationTabRow {
  fundKey: number | null;
  fundCode: string;
  fundName: string;
  period: string;
  commitment: number;
  unfundedAmount: number;
  reserved: number;
  releasedCapital: number;
}

/** GET api/CapitalInvestors/{investorKey}/net-assets */
export interface InvestorNetAssetDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  quarter_year?: string | null;
  quarterYear?: string | null;
  period?: string | null;
  nav?: number | null;
}

export interface InvestorNetAssetTabRow {
  fundKey: number | null;
  fundCode: string;
  fundName: string;
  period: string;
  nav: number;
}

export interface InvestorTransactionTableQueryParams extends ListQueryParams {
  view?: FundCommitmentTimeframe;
  dateKey?: number;
  calendarYear?: number;
  investorKey?: number;
  fundCode?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface InvestorTransactionTableFilterItemDto {
  value?: string | null;
  label?: string | null;
}

export interface InvestorTransactionTableFiltersDto {
  items?: InvestorTransactionTableFilterItemDto[] | null;
}

/** GET api/Funds/{fundKey}/capital-activities */
export interface FundInvestorCapitalActivityDto {
  investor_code?: string | null;
  investorCode?: string | null;
  investor_name?: string | null;
  investorName?: string | null;
  called?: number | null;
  transfer_in?: number | null;
  transferIn?: number | null;
  transfer_out?: number | null;
  transferOut?: number | null;
  redemption?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface FundInvestorCapitalActivityTabRow {
  investorCode: string;
  investorName: string;
  type: string;
  period: string;
  called: number;
  transferIn: number;
  transferOut: number;
  redemption: number;
}

/** GET api/Funds/{fundKey}/distributions-table */
export interface FundInvestorDistributionTableDto {
  investor_code?: string | null;
  investorCode?: string | null;
  investor_name?: string | null;
  investorName?: string | null;
  committed?: number | null;
  unfunded?: number | null;
  cash_dist?: number | null;
  cashDist?: number | null;
  gain_dist?: number | null;
  gainDist?: number | null;
  preferred_return?: number | null;
  preferredReturn?: number | null;
  return_of_capital?: number | null;
  returnOfCapital?: number | null;
  released?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface FundInvestorDistributionTableTabRow {
  investorCode: string;
  investorName: string;
  type: string;
  period: string;
  committed: number;
  unfunded: number;
  cashDist: number;
  gainDist: number;
  preferredReturn: number;
  returnOfCapital: number;
  released: number;
}

/** GET api/Funds/{fundKey}/irr */
export interface FundInvestorIrrDto {
  investor_code?: string | null;
  investorCode?: string | null;
  investor_name?: string | null;
  investorName?: string | null;
  irr_1_year_pct?: number | null;
  irr_3_year_pct?: number | null;
  irr_5_year_pct?: number | null;
  irr_7_year_pct?: number | null;
  irr_10_year_pct?: number | null;
  irr_ltd_pct?: number | null;
  type?: string | null;
  period?: string | null;
}

export interface FundInvestorIrrTabRow {
  investorCode: string;
  investorName: string;
  type: string;
  period: string;
  irr1Year: number | null;
  irr3Year: number | null;
  irr5Year: number | null;
  irr7Year: number | null;
  irr10Year: number | null;
  irrLtd: number | null;
}

/** GET api/Funds/{fundKey}/capital-obligations */
export interface FundInvestorCapitalObligationDto {
  investor_code?: string | null;
  investorCode?: string | null;
  investor_name?: string | null;
  investorName?: string | null;
  quarter_year?: string | null;
  quarterYear?: string | null;
  period?: string | null;
  commitment_amount?: number | null;
  commitmentAmount?: number | null;
  unfunded_amount?: number | null;
  unfundedAmount?: number | null;
  reserved_amount?: number | null;
  reservedAmount?: number | null;
  released_capital_amount?: number | null;
  releasedCapitalAmount?: number | null;
}

export interface FundInvestorCapitalObligationTabRow {
  investorCode: string;
  investorName: string;
  period: string;
  commitment: number;
  unfundedAmount: number;
  reserved: number;
  releasedCapital: number;
}

/** GET api/Funds/{fundKey}/net-assets */
export interface FundInvestorNetAssetDto {
  investor_code?: string | null;
  investorCode?: string | null;
  investor_name?: string | null;
  investorName?: string | null;
  quarter_year?: string | null;
  quarterYear?: string | null;
  period?: string | null;
  nav?: number | null;
}

export interface FundInvestorNetAssetTabRow {
  investorCode: string;
  investorName: string;
  period: string;
  nav: number;
}

export interface FundTransactionTableQueryParams extends ListQueryParams {
  view?: FundCommitmentTimeframe;
  dateKey?: number;
  calendarYear?: number;
  fundKey?: number;
  investorName?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

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
  propertyCode?: string | null;
  investmentType?: string | null;
  developmentType?: string | null;
  geography?: string | null;
  glaSf?: number | null;
  committedSf?: number | null;
  vacantSf?: number | null;
  occupiedPercent?: number | null;
}

export interface AssetsPagedResult extends PagedResult<PropertyListItemDto> {
  summary?: AssetsListSummaryDto | null;
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
  property_key?: number | null;
  propertyKey?: number | null;
  property_code?: string | null;
  propertyCode?: string | null;
  property_name?: string | null;
  propertyName?: string | null;
  geography?: string | null;
  city?: string | null;
  province?: string | null;
  asset_type?: string | null;
  assetType?: string | null;
  investment_type?: string | null;
  investmentType?: string | null;
  development_type?: string | null;
  developmentType?: string | null;
  status?: string | null;
  is_portfolio?: boolean | null;
  isPortfolio?: boolean | null;
  acquisition_date?: string | null;
  acquisitionDate?: string | null;
  total_gla_sf?: number | null;
  totalGlaSf?: number | null;
  committed_area_sf?: number | null;
  committedAreaSf?: number | null;
  vacant_area_sf?: number | null;
  vacantAreaSf?: number | null;
  occupied_area_sf?: number | null;
  occupiedAreaSf?: number | null;
  occupancy_rate?: number | null;
  occupancyRate?: number | null;
  vacancy_rate?: number | null;
  vacancyRate?: number | null;
  est_market_value?: number | null;
  estMarketValue?: number | null;
  est_annual_noi?: number | null;
  estAnnualNoi?: number | null;
  investment_count?: number | null;
  investmentCount?: number | null;
  investmentsCount?: number | null;
  fields?: Record<string, unknown> | null;
  summary?: PropertySummaryDto | null;
  sections?: DynamicSectionDto[] | null;
}

/** GET api/Assets/{propertyKey}/fund-holdings */
export interface AssetFundHoldingDto {
  property_code?: string | null;
  propertyCode?: string | null;
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  fund_strategy_name?: string | null;
  fundStrategyName?: string | null;
  fund_type_name?: string | null;
  fundTypeName?: string | null;
  fund_start_date?: string | null;
  fundStartDate?: string | null;
}

export interface AssetFundHoldingTabRow {
  propertyCode: string;
  fundKey: number;
  fundCode: string;
  fundName: string;
  fundStrategy: string;
  fundType: string;
  fundStartDate: string;
}

export interface AssetPropertyDetailDto {
  property_code?: string | null;
  propertyCode?: string | null;
  property_name?: string | null;
  propertyName?: string | null;
  asset_to_share_pct?: number | null;
  assetToSharePct?: number | null;
  asset_type?: string | null;
  assetType?: string | null;
  investment_type?: string | null;
  investmentType?: string | null;
  development_type?: string | null;
  developmentType?: string | null;
  gross_leasable_area_sqft?: number | null;
  grossLeasableAreaSqft?: number | null;
  committed_area_sqft?: number | null;
  committedAreaSqft?: number | null;
  vacant_area_sqft?: number | null;
  vacantAreaSqft?: number | null;
  occupancy_rate?: number | null;
  occupancyRate?: number | null;
  vacancy_rate?: number | null;
  vacancyRate?: number | null;
}

export interface AssetPropertyDetailTabRow {
  propertyCode: string;
  propertyName: string;
  assetToSharePct: number | null;
  assetType: string;
  investmentType: string;
  developmentType: string;
  grossLeasableAreaSqft: number | null;
  committedAreaSqft: number | null;
  vacantAreaSqft: number | null;
  occupancyRate: number | null;
  vacancyRate: number | null;
}

export interface AssetTypeSummaryDto {
  consolidated_asset_key?: number | null;
  consolidatedAssetKey?: number | null;
  consolidated_asset_code?: string | null;
  consolidatedAssetCode?: string | null;
  consolidated_asset_name?: string | null;
  consolidatedAssetName?: string | null;
  asset_type?: string | null;
  assetType?: string | null;
  gross_leasable_area_sqft?: number | null;
  grossLeasableAreaSqft?: number | null;
  committed_area_sqft?: number | null;
  committedAreaSqft?: number | null;
  vacant_area_sqft?: number | null;
  vacantAreaSqft?: number | null;
  occupancy_rate?: number | null;
  occupancyRate?: number | null;
  vacancy_rate?: number | null;
  vacancyRate?: number | null;
}

export interface AssetTypeSummaryRow {
  assetType: string;
  grossLeasableAreaSqft: number | null;
  committedAreaSqft: number | null;
  vacantAreaSqft: number | null;
  occupancyRate: number | null;
  vacancyRate: number | null;
}

export interface AssetFinancialMetricsDto {
  fund_code?: string | null;
  fundCode?: string | null;
  asset_key?: number | null;
  assetKey?: number | null;
  asset_code?: string | null;
  assetCode?: string | null;
  asset_name?: string | null;
  assetName?: string | null;
  as_of_date?: string | null;
  asOfDate?: string | null;
  asset_ks_ownership_pct?: number | null;
  assetKsOwnershipPct?: number | null;
  asset_cash_at_quarter_end?: number | null;
  assetCashAtQuarterEnd?: number | null;
  asset_total_asset_value?: number | null;
  assetTotalAssetValue?: number | null;
  asset_debt?: number | null;
  assetDebt?: number | null;
  asset_equity?: number | null;
  assetEquity?: number | null;
  asset_noi?: number | null;
  assetNoi?: number | null;
  asset_ffo?: number | null;
  assetFfo?: number | null;
  asset_ncf?: number | null;
  assetNcf?: number | null;
  asset_capex?: number | null;
  assetCapex?: number | null;
  asset_nav_amount?: number | null;
  assetNavAmount?: number | null;
  asset_ebitda?: number | null;
  assetEbitda?: number | null;
  asset_revenue?: number | null;
  assetRevenue?: number | null;
  asset_expense?: number | null;
  assetExpense?: number | null;
  asset_gross_market_value?: number | null;
  assetGrossMarketValue?: number | null;
  asset_gav_amount?: number | null;
  assetGavAmount?: number | null;
  asset_ltv?: number | null;
  assetLtv?: number | null;
  asset_affo?: number | null;
  assetAffo?: number | null;
  asset_capex_pct_noi?: number | null;
  assetCapexPctNoi?: number | null;
  total_noi_growth_amount?: number | null;
  totalNoiGrowthAmount?: number | null;
  total_noi_growth_pct?: number | null;
  totalNoiGrowthPct?: number | null;
  same_store_noi_growth_amount?: number | null;
  sameStoreNoiGrowthAmount?: number | null;
  same_store_noi_growth_pct?: number | null;
  sameStoreNoiGrowthPct?: number | null;
  current_cost_amount?: number | null;
  currentCostAmount?: number | null;
  cost_basis_amount?: number | null;
  costBasisAmount?: number | null;
  budgeted_noi_current_year?: number | null;
  budgetedNoiCurrentYear?: number | null;
  forecasted_noi_current_year?: number | null;
  forecastedNoiCurrentYear?: number | null;
  budgeted_ffo?: number | null;
  budgetedFfo?: number | null;
  forecasted_ffo?: number | null;
  forecastedFfo?: number | null;
}

export interface AssetAcquisitionDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  asset_key?: number | null;
  assetKey?: number | null;
  asset_code?: string | null;
  assetCode?: string | null;
  asset_name?: string | null;
  assetName?: string | null;
  acquisition_date?: string | null;
  acquisitionDate?: string | null;
  at_acquisition_debt?: number | null;
  atAcquisitionDebt?: number | null;
  at_acquisition_equity?: number | null;
  atAcquisitionEquity?: number | null;
  at_acquisition_total_asset_value?: number | null;
  atAcquisitionTotalAssetValue?: number | null;
  at_acquisition_purchase_costs?: number | null;
  atAcquisitionPurchaseCosts?: number | null;
  at_acquisition_ltv?: number | null;
  atAcquisitionLtv?: number | null;
}

export interface AssetSaleDto {
  fund_key?: number | null;
  fundKey?: number | null;
  fund_code?: string | null;
  fundCode?: string | null;
  fund_name?: string | null;
  fundName?: string | null;
  asset_key?: number | null;
  assetKey?: number | null;
  asset_code?: string | null;
  assetCode?: string | null;
  asset_name?: string | null;
  assetName?: string | null;
  sale_date?: string | null;
  saleDate?: string | null;
  at_sale_debt?: number | null;
  atSaleDebt?: number | null;
  at_sale_equity?: number | null;
  atSaleEquity?: number | null;
  at_sale_total_asset_value?: number | null;
  atSaleTotalAssetValue?: number | null;
  at_sale_selling_costs?: number | null;
  atSaleSellingCosts?: number | null;
  at_sale_ltv?: number | null;
  atSaleLtv?: number | null;
  at_sale_noi?: number | null;
  atSaleNoi?: number | null;
}

export interface AssetAcquisitionSaleDto {
  acquisition?: AssetAcquisitionDto | null;
  sale?: AssetSaleDto | null;
}

export interface PropertyLeasingSummaryDto {
  property_key?: number | null;
  propertyKey?: number | null;
  date_key?: number | null;
  dateKey?: number | null;
  last_refreshed_date?: string | null;
  lastRefreshedDate?: string | null;
  gross_leasable_area_sqft?: number | null;
  grossLeasableAreaSqft?: number | null;
  occupied_area_sqft?: number | null;
  occupiedAreaSqft?: number | null;
  committed_area_sqft?: number | null;
  committedAreaSqft?: number | null;
  vacant_area_sqft?: number | null;
  vacantAreaSqft?: number | null;
  total_units?: number | null;
  totalUnits?: number | null;
  occupied_units?: number | null;
  occupiedUnits?: number | null;
  vacant_units?: number | null;
  vacantUnits?: number | null;
  weighted_avg_lease_term_months?: number | null;
  weightedAvgLeaseTermMonths?: number | null;
  weighted_avg_lease_term_rent_months?: number | null;
  weightedAvgLeaseTermRentMonths?: number | null;
  gla_available_to_lease_sqft?: number | null;
  glaAvailableToLeaseSqft?: number | null;
  total_leasing_committed_sqft?: number | null;
  totalLeasingCommittedSqft?: number | null;
  new_leasing_committed_sqft?: number | null;
  newLeasingCommittedSqft?: number | null;
  renewal_leasing_committed_sqft?: number | null;
  renewalLeasingCommittedSqft?: number | null;
  gla_available_to_lease_units?: number | null;
  glaAvailableToLeaseUnits?: number | null;
  total_leasing_committed_units?: number | null;
  totalLeasingCommittedUnits?: number | null;
  new_leasing_committed_units?: number | null;
  newLeasingCommittedUnits?: number | null;
  renewal_leasing_committed_units?: number | null;
  renewalLeasingCommittedUnits?: number | null;
  occupancy_rate?: number | null;
  occupancyRate?: number | null;
  vacancy_rate?: number | null;
  vacancyRate?: number | null;
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

export type DashboardApiWidgetId =
  | 'portfolioValue'
  | 'activeFunds'
  | 'totalAum'
  | 'ytdReturns'
  | 'investorCount'
  | 'assetCount'
  | 'performanceChart'
  | 'assetAllocation'
  | 'fundReturns'
  | 'investorGrowth'
  | 'geographicDistribution';

export interface DashboardWidgetOptionDto {
  id: DashboardApiWidgetId;
  label: string;
}

export type DashboardMetricFormat = 'money' | 'percent' | 'count';

export interface DashboardMetricWidgetDto {
  value: number;
  ytdChange: number | null;
  ytdChangePercent: number | null;
  subtitle: string | null;
  format: DashboardMetricFormat;
}

export interface DashboardChartSeriesDto {
  name: string;
  values: (number | null)[];
}

export interface DashboardLineChartDto {
  categories: string[];
  series: DashboardChartSeriesDto[];
}

export interface DashboardAssetAllocationSliceDto {
  label: string;
  value: number;
  sharePercent: number;
}

export interface DashboardAssetAllocationDto {
  slices: DashboardAssetAllocationSliceDto[];
}

export interface DashboardGeographicItemDto {
  label: string;
  sharePercent: number;
}

export interface DashboardGeographicDistributionDto {
  items: DashboardGeographicItemDto[];
}

export interface DashboardWidgetsDataDto {
  portfolioValue: DashboardMetricWidgetDto | null;
  activeFunds: unknown | null;
  totalAum: DashboardMetricWidgetDto | null;
  ytdReturns: DashboardMetricWidgetDto | null;
  investorCount: DashboardMetricWidgetDto | null;
  assetCount: DashboardMetricWidgetDto | null;
  performanceChart: DashboardLineChartDto | null;
  assetAllocation: DashboardAssetAllocationDto | null;
  fundReturns: DashboardLineChartDto | null;
  investorGrowth: DashboardLineChartDto | null;
  geographicDistribution: DashboardGeographicDistributionDto | null;
}

export interface DashboardResponseDto {
  lastUpdated: string;
  calendarYear: number;
  widgets: DashboardWidgetsDataDto;
}

export interface DashboardQueryParams {
  calendarYear?: number;
  widgets?: string;
}

