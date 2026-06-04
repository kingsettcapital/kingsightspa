import { FundAssetDto, FundAssetTabRow } from '../../shared/models/api.models';

function readString(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
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
    investmentType: readString(dto.investment_type),
    propertyStatus: readString(dto.property_status),
    propertyAcquisition: formatAssetDate(dto.property_acquisition),
    propertyDisposedDate: formatAssetDate(dto.property_disposition),
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
    row.investmentType,
    row.propertyStatus,
    row.propertyAcquisition,
    row.propertyDisposedDate,
  ].join(' ');
}
