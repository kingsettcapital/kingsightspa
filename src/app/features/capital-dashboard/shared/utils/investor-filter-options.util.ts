import {
  InvestorsFilterOptionDto,
  InvestorsFilterOptionsDto,
  InvestorsQuarterlyPeriodDto,
} from '../models/api.models';

export interface InvestorsFilterOption {
  value: string;
  label: string;
}

export interface InvestorsQuarterlyPeriodOption {
  dateKey: number;
  calendarYear: number;
  quarter: number;
  label: string;
  quarterYear: string;
}

export interface InvestorsFilterOptions {
  investorTypes: InvestorsFilterOption[];
  relationships: InvestorsFilterOption[];
  calendarYears: InvestorsFilterOption[];
  quarterlyPeriods: InvestorsQuarterlyPeriodOption[];
}

export const EMPTY_INVESTORS_FILTER_OPTIONS: InvestorsFilterOptions = {
  investorTypes: [],
  relationships: [],
  calendarYears: [],
  quarterlyPeriods: [],
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mapFilterOptions(items: InvestorsFilterOptionDto[] | null | undefined): InvestorsFilterOption[] {
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
): InvestorsQuarterlyPeriodOption[] {
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
    .filter((item): item is InvestorsQuarterlyPeriodOption => item != null);
}

export function normalizeInvestorsFilterOptions(
  response: InvestorsFilterOptionsDto | null | undefined,
): InvestorsFilterOptions {
  const record = readRecord(response);
  if (!record) {
    return EMPTY_INVESTORS_FILTER_OPTIONS;
  }

  return {
    investorTypes: mapFilterOptions(
      (record['investor_types'] ?? record['investorTypes']) as InvestorsFilterOptionDto[] | null | undefined,
    ),
    relationships: mapFilterOptions(
      (record['relationships']) as InvestorsFilterOptionDto[] | null | undefined,
    ),
    calendarYears: mapFilterOptions(
      (record['calendar_years'] ?? record['calendarYears']) as InvestorsFilterOptionDto[] | null | undefined,
    ),
    quarterlyPeriods: mapQuarterlyPeriods(
      (record['quarterly_periods'] ?? record['quarterlyPeriods']) as
        | InvestorsQuarterlyPeriodDto[]
        | null
        | undefined,
    ),
  };
}
