import { FundListItemDto, PropertyListItemDto } from '../shared/models/api.models';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { ActiveAssetRow, ActiveFundRow } from './dashboard.mock-data';

function readRecord(dto: object): Record<string, unknown> {
  return dto as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function mapFundListItemToActiveFundRow(dto: FundListItemDto, index: number): ActiveFundRow {
  const record = readRecord(dto);
  const name = readString(record, 'fundName', 'FundName', 'fund_name') || '—';
  const currentValue = readNumber(record, 'currentValue', 'CurrentValue') ?? dto.currentValue ?? 0;
  const totalReturn =
    readNumber(record, 'totalReturnPercent', 'TotalReturnPercent', 'total_return_percent') ??
    dto.totalReturnPercent;
  const investors =
    readNumber(record, 'investors', 'Investors', 'investorCount', 'investor_count') ?? null;
  const assets = readNumber(record, 'assets', 'Assets', 'assetCount', 'asset_count') ?? null;
  const status = readString(record, 'status', 'Status') || 'Active';

  return {
    rank: index + 1,
    name,
    aum: formatCurrency(currentValue, { compact: true }),
    q3Return: totalReturn != null ? formatPercent(totalReturn) : '—',
    q3ReturnPositive: totalReturn == null || totalReturn >= 0,
    investors: investors ?? 0,
    assets: assets ?? 0,
    status,
  };
}

export function mapPropertyListItemToActiveAssetRow(
  dto: PropertyListItemDto,
  index: number,
): ActiveAssetRow {
  const record = readRecord(dto);
  const name = readString(record, 'propertyName', 'PropertyName', 'property_name') || '—';
  const assetType =
    readString(record, 'assetType', 'AssetType', 'asset_type', 'asset_type_name') || '—';
  const city = readString(record, 'city', 'City') || '—';
  const currentValue = readNumber(record, 'currentValue', 'CurrentValue') ?? dto.currentValue ?? 0;
  const yieldPercent =
    readNumber(record, 'yieldPercent', 'YieldPercent', 'yield', 'Yield') ?? dto.yieldPercent;
  const occupiedPercent =
    readNumber(record, 'occupiedPercent', 'OccupiedPercent', 'occupied_percent') ??
    dto.occupiedPercent;
  const status = readString(record, 'status', 'Status') || '—';
  const normalizedStatus = status.toLowerCase();
  const statusTone: ActiveAssetRow['statusTone'] =
    normalizedStatus.includes('value') || normalizedStatus.includes('development')
      ? 'warning'
      : 'positive';
  const occupancyTone: ActiveAssetRow['occupancyTone'] =
    occupiedPercent != null && occupiedPercent < 90 ? 'warning' : 'positive';

  return {
    rank: index + 1,
    name,
    type: assetType,
    city,
    marketValue: formatCurrency(currentValue, { compact: true }),
    quarterlyNoi: yieldPercent != null ? formatPercent(yieldPercent) : '—',
    occupancy:
      occupiedPercent != null
        ? `${occupiedPercent.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
          })}%`
        : '—',
    occupancyTone,
    status,
    statusTone,
  };
}
