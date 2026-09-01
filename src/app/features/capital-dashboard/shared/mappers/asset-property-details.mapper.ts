import { AssetPropertyDetailDto, AssetPropertyDetailTabRow } from '../models/api.models';

function readString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '—';
}

function readNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function mapAssetPropertyDetailsToTabRows(
  items: AssetPropertyDetailDto[] | null | undefined,
): AssetPropertyDetailTabRow[] {
  return (items ?? []).map((dto) => ({
    propertyCode: readString(dto.property_code, dto.propertyCode),
    propertyName: readString(dto.property_name, dto.propertyName),
    assetToSharePct: readNumber(dto.asset_to_share_pct, dto.assetToSharePct),
    assetType: readString(dto.asset_type, dto.assetType),
    investmentType: readString(dto.investment_type, dto.investmentType),
    developmentType: readString(dto.development_type, dto.developmentType),
    grossLeasableAreaSqft: readNumber(dto.gross_leasable_area_sqft, dto.grossLeasableAreaSqft),
    committedAreaSqft: readNumber(dto.committed_area_sqft, dto.committedAreaSqft),
    vacantAreaSqft: readNumber(dto.vacant_area_sqft, dto.vacantAreaSqft),
    occupancyRate: readNumber(dto.occupancy_rate, dto.occupancyRate),
    vacancyRate: readNumber(dto.vacancy_rate, dto.vacancyRate),
  }));
}
