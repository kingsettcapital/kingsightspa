import { FundPeriodDto } from '../models/api.models';

/** Shape shared by the fund and investor quarterly period options. */
export interface QuarterPeriodOption {
  dateKey: number;
  calendarYear: number;
  quarter: number;
  quarterYear: string;
}

export interface QuarterSelection {
  quarter: number;
  year: number;
}

export const ALL_QUARTERS: readonly number[] = [1, 2, 3, 4];

function periodKey(calendarYear: number, quarterYear: string): string {
  return `${calendarYear}|${quarterYear.trim().toLowerCase()}`;
}

/** Keys for the quarters a fund/investor has data in (from its `/periods?view=quarterly` response). */
export function quarterKeysFromPeriods(items: FundPeriodDto[] | null | undefined): Set<string> {
  const keys = new Set<string>();
  for (const item of items ?? []) {
    const year = Number(item.calendar_year ?? item.calendarYear);
    const quarterYear = String(item.quarter_year ?? item.quarterYear ?? '').trim();
    if (Number.isFinite(year) && quarterYear) {
      keys.add(periodKey(year, quarterYear));
    }
  }
  return keys;
}

/**
 * The global quarterly options narrowed to the quarters the current fund/investor has data in.
 * `keys` undefined = still loading (nothing selectable yet); null = lookup failed (fall back to all).
 */
export function periodsWithData<T extends QuarterPeriodOption>(
  periods: readonly T[],
  keys: Set<string> | null | undefined,
): T[] {
  if (keys === undefined) {
    return [];
  }
  if (keys === null) {
    return [...periods];
  }
  return periods.filter((period) => keys.has(periodKey(period.calendarYear, period.quarterYear)));
}

/** Years with data, newest first. */
export function yearsWithData(periods: readonly QuarterPeriodOption[]): number[] {
  return [...new Set(periods.map((period) => period.calendarYear))].sort((a, b) => b - a);
}

/** Quarters with data in `year`, ascending. */
export function quartersWithData(periods: readonly QuarterPeriodOption[], year: number | null): number[] {
  if (year == null) {
    return [];
  }
  return [
    ...new Set(periods.filter((period) => period.calendarYear === year).map((period) => period.quarter)),
  ].sort((a, b) => a - b);
}

/** Most recent quarter with data, limited to `year` when given. */
export function latestQuarterWithData(
  periods: readonly QuarterPeriodOption[],
  year?: number | null,
): QuarterSelection | null {
  let best: QuarterSelection | null = null;
  for (const period of periods) {
    if (year != null && period.calendarYear !== year) {
      continue;
    }
    if (
      !best ||
      period.calendarYear > best.year ||
      (period.calendarYear === best.year && period.quarter > best.quarter)
    ) {
      best = { quarter: period.quarter, year: period.calendarYear };
    }
  }
  return best;
}

export function hasQuarterData(
  periods: readonly QuarterPeriodOption[],
  quarter: number | 'all' | null,
  year: number | null,
): boolean {
  return (
    typeof quarter === 'number' &&
    year != null &&
    periods.some((period) => period.quarter === quarter && period.calendarYear === year)
  );
}

/** "Period:" chip text, e.g. "Q1 · 2026". */
export function quarterPeriodLabel(quarter: number | 'all' | null, year: number | null): string {
  return typeof quarter === 'number' && year != null ? `Q${quarter} · ${year}` : 'Quarterly';
}
