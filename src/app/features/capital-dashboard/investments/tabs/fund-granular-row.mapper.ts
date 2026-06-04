import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundGranularRowDto,
} from '../../shared/models/api.models';

function formatGranularDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapFundGranularRowToAmountTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundAmountTabRow {
  const description = dto.description ?? '';

  if (timeframe === 'daily' && dto.date) {
    return {
      date: formatGranularDate(dto.date),
      amount: dto.amount ?? 0,
      description,
    };
  }

  return {
    period: dto.period ?? '',
    amount: dto.amount ?? 0,
    description,
  };
}

export function mapFundGranularRowToTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow {
  return {
    ...mapFundGranularRowToAmountTabRow(dto, timeframe),
    units: String(dto.units ?? 0),
  };
}

export function mapFundGranularRowsToAmountTabRows(
  items: FundGranularRowDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundAmountTabRow[] {
  return (items ?? []).map((item) => mapFundGranularRowToAmountTabRow(item, timeframe));
}

export function mapFundGranularRowsToTabRows(
  items: FundGranularRowDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow[] {
  return (items ?? []).map((item) => mapFundGranularRowToTabRow(item, timeframe));
}
