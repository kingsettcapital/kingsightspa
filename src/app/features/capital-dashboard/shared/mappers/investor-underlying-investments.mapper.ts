import {
  InvestorUnderlyingInvestmentDto,
  InvestorUnderlyingInvestmentTabRow,
} from '../models/api.models';

const EMPTY = '—';

function readString(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return EMPTY;
}

function mapDto(dto: InvestorUnderlyingInvestmentDto): InvestorUnderlyingInvestmentTabRow {
  return {
    propertyName: readString(dto.property_name, dto.propertyName),
    city: readString(dto.city),
    province: readString(dto.province),
    geography: readString(dto.geography),
    assetType: readString(dto.asset_type, dto.assetType),
    assetSubType: readString(dto.asset_sub_type, dto.assetSubType),
    investmentType: readString(dto.investment_type, dto.investmentType),
  };
}

export function mapInvestorUnderlyingInvestmentsToTabRows(
  items: InvestorUnderlyingInvestmentDto[] | null | undefined,
): InvestorUnderlyingInvestmentTabRow[] {
  return (items ?? []).map((item) => mapDto(item));
}

export function investorUnderlyingAssetSearchText(row: InvestorUnderlyingInvestmentTabRow): string {
  return [
    row.propertyName,
    row.city,
    row.province,
    row.geography,
    row.assetType,
    row.assetSubType,
    row.investmentType,
  ].join(' ');
}
