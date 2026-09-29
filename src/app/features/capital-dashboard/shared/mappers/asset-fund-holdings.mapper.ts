import { AssetFundHoldingDto, AssetFundHoldingTabRow } from '../models/api.models';

function readString(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '—';
}

function readFundKey(dto: AssetFundHoldingDto): number {
  const candidates = [dto.fund_key, dto.fundKey];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function formatFundStartDate(iso: string | null | undefined): string {
  const trimmed = iso?.trim();
  if (!trimmed) {
    return '—';
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function mapAssetFundHoldingsToTabRows(
  items: AssetFundHoldingDto[] | null | undefined,
): AssetFundHoldingTabRow[] {
  return (items ?? []).map((dto) => ({
    propertyCode: readString(dto.property_code, dto.propertyCode),
    fundKey: readFundKey(dto),
    fundCode: readString(dto.fund_code, dto.fundCode),
    fundName: readString(dto.fund_name, dto.fundName),
    fundStrategy: readString(dto.fund_strategy_name, dto.fundStrategyName),
    fundType: readString(dto.fund_type_name, dto.fundTypeName),
    fundStartDate: formatFundStartDate(dto.fund_start_date ?? dto.fundStartDate),
  }));
}
