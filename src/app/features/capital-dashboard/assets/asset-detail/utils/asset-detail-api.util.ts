import {
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
} from '../../../shared/models/api.models';

export const ASSET_DETAIL_EMPTY = '--';

function detailRecord(detail: PropertyDetailDto | null): Record<string, unknown> {
  return (detail ?? {}) as unknown as Record<string, unknown>;
}

function summaryRecord(detail: PropertyDetailDto | null): Record<string, unknown> {
  return (detail?.summary ?? {}) as unknown as Record<string, unknown>;
}

function leasingRecord(summary: PropertyLeasingSummaryDto | null): Record<string, unknown> {
  return (summary ?? {}) as unknown as Record<string, unknown>;
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

export function readPropertyDetailString(detail: PropertyDetailDto | null, ...keys: string[]): string {
  return (
    readStringFromRecord(detailRecord(detail), ...keys) ||
    readStringFromRecord(summaryRecord(detail), ...keys)
  );
}

export function readPropertyDetailNumber(
  detail: PropertyDetailDto | null,
  ...keys: string[]
): number | null {
  const fromTop = readNumberFromRecord(detailRecord(detail), ...keys);
  if (fromTop != null) {
    return fromTop;
  }
  return readNumberFromRecord(summaryRecord(detail), ...keys);
}

export function readPropertyDetailKey(detail: PropertyDetailDto | null): number | null {
  const key = readPropertyDetailNumber(detail, 'property_key', 'propertyKey');
  return key != null && key > 0 ? key : null;
}

export function readLeasingSummaryNumber(
  summary: PropertyLeasingSummaryDto | null,
  ...keys: string[]
): number | null {
  return readNumberFromRecord(leasingRecord(summary), ...keys);
}

export function readLeasingSummaryString(
  summary: PropertyLeasingSummaryDto | null,
  ...keys: string[]
): string {
  return readStringFromRecord(leasingRecord(summary), ...keys);
}

export function propertyDetailHasProfileData(detail: PropertyDetailDto | null): boolean {
  if (!detail) {
    return false;
  }
  return (
    readPropertyDetailString(detail, 'property_name', 'propertyName', 'property_code', 'propertyCode')
      .length > 0 || readPropertyDetailNumber(detail, 'total_gla_sf', 'totalGlaSf') != null
  );
}

export function formatAssetDisplayString(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : ASSET_DETAIL_EMPTY;
}

export function formatAssetDisplayPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return ASSET_DETAIL_EMPTY;
  }
  return `${value.toFixed(1)}%`;
}

export function formatAssetDisplayMonths(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return ASSET_DETAIL_EMPTY;
  }
  return `${value.toFixed(1)} mo`;
}

export function formatAssetDisplayCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return ASSET_DETAIL_EMPTY;
  }
  return String(Math.round(value));
}

export function formatAssetDisplaySqFt(
  value: number | null | undefined,
  compact = false,
): string {
  if (value == null || !Number.isFinite(value)) {
    return ASSET_DETAIL_EMPTY;
  }

  const abs = Math.abs(value);
  if (compact) {
    if (abs >= 1_000_000) {
      const scaled = abs / 1_000_000;
      const truncated = Math.trunc(scaled * 100) / 100;
      return `${truncated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M sf`;
    }
    if (abs >= 1_000) {
      const scaled = abs / 1_000;
      const truncated = Math.trunc(scaled * 10) / 10;
      return `${truncated.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K sf`;
    }
  }

  return `${Math.round(abs).toLocaleString('en-US')} sf`;
}

export function formatAssetDisplayCurrency(
  value: number | null | undefined,
  compact = false,
): string {
  if (value == null || !Number.isFinite(value)) {
    return ASSET_DETAIL_EMPTY;
  }

  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
