import { AssetTypeSummaryDto, AssetTypeSummaryRow } from '../models/api.models';

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

export function mapAssetTypeSummaryToRows(
  items: AssetTypeSummaryDto[] | null | undefined,
): AssetTypeSummaryRow[] {
  return (items ?? []).map((dto) => ({
    assetType: readString(dto.asset_type, dto.assetType),
    grossLeasableAreaSqft: readNumber(dto.gross_leasable_area_sqft, dto.grossLeasableAreaSqft),
    committedAreaSqft: readNumber(dto.committed_area_sqft, dto.committedAreaSqft),
    vacantAreaSqft: readNumber(dto.vacant_area_sqft, dto.vacantAreaSqft),
    occupancyRate: readNumber(dto.occupancy_rate, dto.occupancyRate),
    vacancyRate: readNumber(dto.vacancy_rate, dto.vacancyRate),
  }));
}
