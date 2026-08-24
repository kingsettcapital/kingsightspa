import {
  AssetsFilterOptionDto,
  AssetsFilterOptionsDto,
  InvestorsQuarterlyPeriodDto,
} from '../models/api.models';

export interface AssetsFilterOption {
  value: string;
  label: string;
}

export interface AssetsQuarterlyPeriodOption {
  dateKey: number;
  calendarYear: number;
  quarter: number;
  label: string;
  quarterYear: string;
}

export interface AssetsFilterOptions {
  assetTypes: AssetsFilterOption[];
  investmentTypes: AssetsFilterOption[];
  geographies: AssetsFilterOption[];
  statuses: AssetsFilterOption[];
  quarterlyPeriods: AssetsQuarterlyPeriodOption[];
}

export const EMPTY_ASSETS_FILTER_OPTIONS: AssetsFilterOptions = {
  assetTypes: [],
  investmentTypes: [],
  geographies: [],
  statuses: [],
  quarterlyPeriods: [],
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mapFilterOptions(items: AssetsFilterOptionDto[] | null | undefined): AssetsFilterOption[] {
  if (!items?.length) {
    return [];
  }

  return items
    .map((item) => {
      const record = readRecord(item);
      const value = String(record?.['value'] ?? record?.['Value'] ?? '');
      const label = String(record?.['label'] ?? record?.['Label'] ?? value);
      return { value, label };
    })
    .filter((item) => item.value.length > 0);
}

function mapQuarterlyPeriods(
  items: InvestorsQuarterlyPeriodDto[] | null | undefined,
): AssetsQuarterlyPeriodOption[] {
  if (!items?.length) {
    return [];
  }

  return items
    .map((item) => {
      const record = readRecord(item);
      if (!record) {
        return null;
      }

      const dateKey = Number(record['date_key'] ?? record['dateKey']);
      const calendarYear = Number(record['calendar_year'] ?? record['calendarYear']);
      const quarter = Number(record['quarter'] ?? record['Quarter']);
      const label = String(record['label'] ?? record['quarter_year'] ?? record['quarterYear'] ?? '').trim();
      const quarterYear = String(record['quarter_year'] ?? record['quarterYear'] ?? label).trim();

      if (!Number.isFinite(dateKey) || !Number.isFinite(quarter)) {
        return null;
      }

      return {
        dateKey,
        calendarYear: Number.isFinite(calendarYear) ? calendarYear : 0,
        quarter,
        label: label || quarterYear,
        quarterYear: quarterYear || label,
      };
    })
    .filter((item): item is AssetsQuarterlyPeriodOption => item != null);
}

export function normalizeAssetsFilterOptions(
  response: AssetsFilterOptionsDto | null | undefined,
): AssetsFilterOptions {
  const record = readRecord(response);
  if (!record) {
    return EMPTY_ASSETS_FILTER_OPTIONS;
  }

  return {
    assetTypes: mapFilterOptions(
      (record['asset_types'] ?? record['assetTypes']) as AssetsFilterOptionDto[] | null | undefined,
    ),
    investmentTypes: mapFilterOptions(
      (record['investment_types'] ?? record['investmentTypes']) as
        | AssetsFilterOptionDto[]
        | null
        | undefined,
    ),
    geographies: mapFilterOptions(
      record['geographies'] as AssetsFilterOptionDto[] | null | undefined,
    ),
    statuses: mapFilterOptions(record['statuses'] as AssetsFilterOptionDto[] | null | undefined),
    quarterlyPeriods: mapQuarterlyPeriods(
      (record['quarterly_periods'] ?? record['quarterlyPeriods']) as
        | InvestorsQuarterlyPeriodDto[]
        | null
        | undefined,
    ),
  };
}
