export interface QuarterlyTransactionPeriodParams {
  dateKey?: number;
  calendarYear?: number;
}

export function buildQuarterlyTransactionPeriodParams(
  timeframe: 'ltd' | 'quarterly' | 'daily',
  quarterScope: number | 'all',
  year: number | null,
  dateKey: number | null,
): QuarterlyTransactionPeriodParams {
  if (timeframe !== 'quarterly') {
    return {};
  }

  if (quarterScope === 'all') {
    return year != null ? { calendarYear: year } : {};
  }

  return dateKey != null ? { dateKey } : {};
}

export function quarterlyTransactionPeriodCacheSegment(
  dateKey?: number,
  calendarYear?: number,
): string {
  if (dateKey != null) {
    return `dk\u0000${dateKey}`;
  }
  if (calendarYear != null) {
    return `cy\u0000${calendarYear}`;
  }
  return '';
}
