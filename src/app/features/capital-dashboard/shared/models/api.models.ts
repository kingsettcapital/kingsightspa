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
  investorType: string | null;
  totalInvested: number;
  totalInvestedFmv: number;
  totalReturnPercent?: number | null;
  status: string | null;
  memberSince: string | null;
  joinYear: number | null;
}

export interface PropertyListItemDto {
  propertyKey: number;
  propertyName: string | null;
  city: string | null;
  province: string | null;
  assetType: string | null;
  status: string | null;
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

