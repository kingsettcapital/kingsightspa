import {
  FundCommitmentTimeframe,
  FundPeriodDto,
  FundPeriodSource,
} from '../models/api.models';

export type { FundPeriodSource };

export type FundPeriodFilterValue = 'all' | number;

export interface FundPeriodSelectOption {
  value: number;
  label: string;
  disabled: boolean;
}

export function fundPeriodsCacheKey(
  fundKey: number,
  source: FundPeriodSource,
  view: FundCommitmentTimeframe,
): string {
  return `periods\u0000${fundKey}\u0000${source}\u0000${view}`;
}

export function fundPeriodDateKey(dto: FundPeriodDto): number | null {
  const key = dto.date_key ?? dto.dateKey;
  return key != null && !Number.isNaN(Number(key)) ? Number(key) : null;
}

export function fundPeriodLabel(dto: FundPeriodDto): string {
  const label = dto.label?.trim();
  if (label) return label;
  const key = fundPeriodDateKey(dto);
  return key != null ? String(key) : '';
}

export function mapFundPeriodsToSelectOptions(
  items: FundPeriodDto[] | null | undefined,
): FundPeriodSelectOption[] {
  const options: FundPeriodSelectOption[] = [];
  for (const dto of items ?? []) {
    const value = fundPeriodDateKey(dto);
    if (value == null) continue;
    options.push({
      value,
      label: fundPeriodLabel(dto),
      disabled: !!dto.disabled,
    });
  }
  return options;
}

export function dateKeyFromPeriodFilter(period: FundPeriodFilterValue): number | undefined {
  return period === 'all' ? undefined : period;
}

/** Period dropdown selection remembered per LTD / Quarterly / Daily view. */
export type FundPeriodByTimeframe = Partial<Record<FundCommitmentTimeframe, FundPeriodFilterValue>>;

export function periodForTimeframe(
  byTimeframe: FundPeriodByTimeframe,
  timeframe: FundCommitmentTimeframe,
): FundPeriodFilterValue {
  return byTimeframe[timeframe] ?? 'all';
}

export function setPeriodForTimeframe(
  byTimeframe: FundPeriodByTimeframe,
  timeframe: FundCommitmentTimeframe,
  period: FundPeriodFilterValue,
): FundPeriodByTimeframe {
  return { ...byTimeframe, [timeframe]: period };
}
