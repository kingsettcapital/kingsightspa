import { AssetsListSummaryDto, PropertyListItemDto } from '../models/api.models';
import { investorInitials } from './investor-list-row.util';

export interface AssetTableRow {
  propertyKey: number;
  name: string;
  code: string;
  initials: string;
  avatarHue: number;
  geography: string;
  assetType: string;
  assetTypeHue: number;
  investmentType: string;
  developmentType: string;
  glaSf: number;
  occupiedPercent: number;
  committedSf: number;
  vacantSf: number;
  status: string;
}

const AVATAR_HUES = [210, 250, 170, 30, 340, 190, 280, 15];

const ASSET_TYPE_HUES: Record<string, number> = {
  retail: 270,
  industrial: 32,
  office: 210,
  'mixed-use': 145,
  'mixed use': 145,
  urban: 330,
};

const DEFAULT_ASSET_TYPE_HUE = 210;

function readRecord(dto: PropertyListItemDto): Record<string, unknown> {
  return dto as unknown as Record<string, unknown>;
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

function readNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readNullableNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (value == null) {
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function assetTypeHue(assetType: string): number {
  const key = assetType.trim().toLowerCase();
  return ASSET_TYPE_HUES[key] ?? DEFAULT_ASSET_TYPE_HUE;
}

/** GLA column progress: `(gla / commitment) * 100` where commitment is committed area (sf). */
export function computeGlaCommitmentPercent(glaSf: number, committedSf: number): number | null {
  if (!Number.isFinite(glaSf) || !Number.isFinite(committedSf) || glaSf <= 0 || committedSf <= 0) {
    return null;
  }

  return (glaSf / committedSf) * 100;
}

export function clampBarFillPercent(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
}

function resolveGlaCommitmentPercent(glaSf: number, committedSf: number, vacantSf: number): number {
  const effectiveGla = glaSf > 0 ? glaSf : committedSf + vacantSf;
  if (effectiveGla <= 0 || committedSf <= 0) {
    return 0;
  }

  return computeGlaCommitmentPercent(effectiveGla, committedSf) ?? 0;
}

export function formatAreaNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }

  return Math.round(Math.abs(value)).toLocaleString('en-US');
}

export function formatSquareFeet(value: number | null | undefined, compact = false): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
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

  return `${formatAreaNumber(value)} sf`;
}

export function assetTypeColor(hue: number): string {
  return `hsl(${hue} 62% 48%)`;
}

export function formatOccupiedPercent(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatted}% occupied`;
}

export function mapPropertyListItemToRow(dto: PropertyListItemDto, index: number): AssetTableRow {
  const record = readRecord(dto);
  const name = readString(record, 'propertyName', 'PropertyName', 'property_name') || '—';
  const code =
    readString(
      record,
      'property_code',
      'propertyCode',
      'PropertyCode',
      'property_id',
      'propertyId',
    ) || `P${String(dto.propertyKey).padStart(3, '0')}`;
  const city = readString(record, 'city', 'City');
  const province = readString(record, 'province', 'Province', 'state', 'State');
  const geography =
    readString(record, 'geography', 'Geography') ||
    [city, province].filter(Boolean).join(', ') ||
    '—';
  const assetType =
    readString(
      record,
      'asset_type',
      'asset_type_name',
      'assetTypeName',
      'assetType',
      'AssetType',
    ) || '—';
  const investmentType =
    readString(
      record,
      'investment_type',
      'investment_type_name',
      'investmentTypeName',
      'investmentType',
      'InvestmentType',
    ) || '—';
  const developmentType =
    readString(
      record,
      'development_type',
      'development_type_name',
      'developmentTypeName',
      'developmentType',
      'DevelopmentType',
    ) || '—';
  const glaSf = readNumber(
    record,
    'gla_sf',
    'glaSf',
    'GlaSf',
    'gross_leasable_area',
    'grossLeasableArea',
    'currentValue',
    'CurrentValue',
  );
  const committedSf = readNumber(
    record,
    'committed_sf',
    'committedSf',
    'CommittedSf',
    'committed_area',
    'committedArea',
  );
  const vacantSf = readNumber(
    record,
    'vacant_sf',
    'vacantSf',
    'VacantSf',
    'vacant_area',
    'vacantArea',
  );
  const status =
    readString(record, 'status', 'Status', 'property_status', 'propertyStatus', 'status_name', 'statusName') ||
    '—';
  const effectiveGlaSf = glaSf > 0 ? glaSf : committedSf + vacantSf;
  const occupiedPercent = resolveGlaCommitmentPercent(glaSf, committedSf, vacantSf);

  return {
    propertyKey: dto.propertyKey,
    name,
    code,
    initials: investorInitials(name),
    avatarHue: AVATAR_HUES[index % AVATAR_HUES.length],
    geography,
    assetType,
    assetTypeHue: assetTypeHue(assetType),
    investmentType,
    developmentType,
    glaSf: effectiveGlaSf > 0 ? effectiveGlaSf : glaSf,
    occupiedPercent,
    committedSf,
    vacantSf,
    status,
  };
}

export function extractAssetsListSummary(result: unknown): AssetsListSummaryDto | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as Record<string, unknown>;
  const summary = record['summary'] ?? record['Summary'];
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  const s = summary as Record<string, unknown>;
  const totalGla = readNumber(
    s,
    'total_gla_sf',
    'total_gla',
    'totalGla',
    'TotalGla',
    'totalGlaSf',
  );
  const activeProperties = readNumber(s, 'active_properties', 'activeProperties', 'ActiveProperties');
  const totalProperties = readNumber(s, 'total_properties', 'totalProperties', 'TotalProperties');
  const totalCommittedArea = readNumber(
    s,
    'total_committed_sf',
    'total_committed_area',
    'totalCommittedArea',
    'TotalCommittedArea',
    'totalCommittedSf',
  );
  const totalVacantArea = readNumber(
    s,
    'total_vacant_sf',
    'total_vacant_area',
    'totalVacantArea',
    'TotalVacantArea',
    'totalVacantSf',
  );

  return {
    ...(totalGla > 0 ? { totalGla } : {}),
    ...(activeProperties > 0 ? { activeProperties } : {}),
    ...(totalProperties > 0 ? { totalProperties } : {}),
    totalCommittedArea,
    totalVacantArea,
  };
}

export type AssetsTableSortColumn =
  | 'propertyName'
  | 'geography'
  | 'assetType'
  | 'investmentType'
  | 'developmentType'
  | 'glaSf'
  | 'committedSf'
  | 'vacantSf'
  | 'status';

export type AssetsTableSortDirection = 'asc' | 'desc';

/** API `sortBy` values for `GET /api/Assets` — must match response property names. */
export const ASSETS_TABLE_SORT_API_FIELDS: Record<AssetsTableSortColumn, string> = {
  propertyName: 'propertyName',
  geography: 'geography',
  assetType: 'asset_type',
  investmentType: 'investment_type',
  developmentType: 'development_type',
  glaSf: 'gla_sf',
  committedSf: 'committed_sf',
  vacantSf: 'vacant_sf',
  status: 'status',
};

const NUMERIC_ASSETS_SORT_COLUMNS = new Set<AssetsTableSortColumn>([
  'glaSf',
  'committedSf',
  'vacantSf',
]);

export function defaultAssetsSortDirection(column: AssetsTableSortColumn): AssetsTableSortDirection {
  return NUMERIC_ASSETS_SORT_COLUMNS.has(column) ? 'desc' : 'asc';
}

export function buildAssetsListCacheKey(filters: {
  view: 'ltd' | 'quarterly';
  dateKey: number | null;
  assetType: string;
  investmentType: string;
  geography: string;
  status: string;
  sortBy: string | null;
  sortDir: AssetsTableSortDirection | null;
}): string {
  return [
    filters.view,
    filters.dateKey ?? '',
    filters.assetType,
    filters.investmentType,
    filters.geography,
    filters.status,
    filters.sortBy ?? '',
    filters.sortDir ?? '',
  ].join('|');
}
