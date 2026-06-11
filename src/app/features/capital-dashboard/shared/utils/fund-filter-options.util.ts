import {
  FundsFilterOptionDto,
  FundsFilterOptionsDto,
  FundsQuarterlyPeriodDto,
} from '../models/api.models';

export interface FundsFilterOption {
  value: string;
  label: string;
}

export interface FundsQuarterlyPeriodOption {
  dateKey: number;
  calendarYear: number;
  quarter: number;
  label: string;
  quarterYear: string;
}

export interface FundsFilterOptions {
  fundTypes: FundsFilterOption[];
  strategies: FundsFilterOption[];
  calendarYears: FundsFilterOption[];
  quarterlyPeriods: FundsQuarterlyPeriodOption[];
}

export const EMPTY_FUNDS_FILTER_OPTIONS: FundsFilterOptions = {
  fundTypes: [],
  strategies: [],
  calendarYears: [],
  quarterlyPeriods: [],
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mapFilterOptions(items: FundsFilterOptionDto[] | null | undefined): FundsFilterOption[] {
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
  items: FundsQuarterlyPeriodDto[] | null | undefined,
): FundsQuarterlyPeriodOption[] {
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
      const quarter = Number(record['quarter']);
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
    .filter((item): item is FundsQuarterlyPeriodOption => item != null);
}

export function normalizeFundsFilterOptions(
  response: FundsFilterOptionsDto | null | undefined,
): FundsFilterOptions {
  const record = readRecord(response);
  if (!record) {
    return EMPTY_FUNDS_FILTER_OPTIONS;
  }

  return {
    fundTypes: mapFilterOptions(
      (record['fund_types'] ?? record['fundTypes']) as FundsFilterOptionDto[] | null | undefined,
    ),
    strategies: mapFilterOptions(
      (record['strategies']) as FundsFilterOptionDto[] | null | undefined,
    ),
    calendarYears: mapFilterOptions(
      (record['calendar_years'] ?? record['calendarYears']) as FundsFilterOptionDto[] | null | undefined,
    ),
    quarterlyPeriods: mapQuarterlyPeriods(
      (record['quarterly_periods'] ?? record['quarterlyPeriods']) as
        | FundsQuarterlyPeriodDto[]
        | null
        | undefined,
    ),
  };
}
