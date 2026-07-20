import { FundDetailDto } from '../../../shared/models/api.models';

export const FUND_OVERVIEW_EMPTY = '--';

function detailRecord(detail: FundDetailDto | null): Record<string, unknown> {
  return (detail ?? {}) as unknown as Record<string, unknown>;
}

function summaryRecord(detail: FundDetailDto | null): Record<string, unknown> {
  return (detail?.summary ?? {}) as unknown as Record<string, unknown>;
}

function readStringFromRecord(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readNumberFromRecord(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function readFundDetailString(detail: FundDetailDto | null, ...keys: string[]): string {
  return (
    readStringFromRecord(detailRecord(detail), ...keys) ||
    readStringFromRecord(summaryRecord(detail), ...keys)
  );
}

export function readFundDetailNumber(detail: FundDetailDto | null, ...keys: string[]): number | null {
  const fromTop = readNumberFromRecord(detailRecord(detail), ...keys);
  if (fromTop != null) {
    return fromTop;
  }
  return readNumberFromRecord(summaryRecord(detail), ...keys);
}

export function readFundDetailKey(detail: FundDetailDto | null): number | null {
  const key =
    readFundDetailNumber(detail, 'fund_key', 'fundKey') ??
    readFundDetailNumber(detail, 'fundId', 'fund_id');
  return key != null && key > 0 ? key : null;
}

export function fundDetailHasProfileData(detail: FundDetailDto | null): boolean {
  if (!detail) {
    return false;
  }
  return (
    readFundDetailString(detail, 'fund_name', 'fundName', 'fund_code', 'fundCode').length > 0 ||
    readFundDetailNumber(detail, 'total_commitment', 'totalCommitment') != null
  );
}
