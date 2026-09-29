import { FundAssetDto, FundAssetTabRow } from '../models/api.models';

function readString(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

function readStringCandidates(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '—';
}

function readNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatAssetDate(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return '—';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapFundAssetToTabRow(dto: FundAssetDto): FundAssetTabRow {
  const propertyKey =
    typeof dto.propertyKey === 'number' && Number.isFinite(dto.propertyKey) ? dto.propertyKey : null;

  return {
    propertyKey,
    assetName: readString(dto.property_name),
    city: readString(dto.city),
    province: readString(dto.province),
    geography: readString(dto.geography),
    assetType: readString(dto.asset_type),
    assetSubType: readStringCandidates(dto.asset_sub_type, dto.assetSubType),
    investmentType: readString(dto.investment_type),
    propertyStatus: readString(dto.property_status),
    propertyDisposition: formatAssetDate(dto.property_disposition),
    propertyAcquisition: formatAssetDate(dto.property_acquisition),
    glaSf: readNumber(dto.gla_sf),
    occupancyPct: readNumber(dto.occupancy_pct),
    marketValue: readNumber(dto.market_value),
    capRate: readNumber(dto.cap_rate),
    status: readString(dto.status),
  };
}

export function mapFundAssetsToTabRows(
  items: FundAssetDto[] | null | undefined,
): FundAssetTabRow[] {
  return (items ?? []).map(mapFundAssetToTabRow);
}

export function fundAssetTabRowSearchText(row: FundAssetTabRow): string {
  return [
    row.assetName,
    row.city,
    row.province,
    row.geography,
    row.assetType,
    row.assetSubType,
    row.investmentType,
    row.propertyStatus,
    row.propertyDisposition,
    row.propertyAcquisition,
    row.status,
  ].join(' ');
}
