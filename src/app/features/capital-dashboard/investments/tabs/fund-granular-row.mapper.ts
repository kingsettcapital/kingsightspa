import {
  FundCommitmentTimeframe,
  FundGranularRowDto,
  FundCommitmentTabRow,
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

export function mapFundGranularRowToTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow {
  const units = String(dto.units ?? 0);
  const description = dto.description ?? '';

  if (timeframe === 'daily' && dto.date) {
    return {
      date: formatGranularDate(dto.date),
      amount: dto.amount ?? 0,
      units,
      description,
    };
  }

  return {
    period: dto.period ?? '',
    amount: dto.amount ?? 0,
    units,
    description,
  };
}

export function mapFundGranularRowsToTabRows(
  items: FundGranularRowDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow[] {
  return (items ?? []).map((item) => mapFundGranularRowToTabRow(item, timeframe));
}
