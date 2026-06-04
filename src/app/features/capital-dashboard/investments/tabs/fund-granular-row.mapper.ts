import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundGranularRowDto,
} from '../../shared/models/api.models';

function readGranularAmount(dto: FundGranularRowDto): number {
  const candidates = [dto.amount, dto.invested_amount, dto.distributed_amount];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readGranularUnits(dto: FundGranularRowDto): number {
  if (typeof dto.units === 'number' && Number.isFinite(dto.units)) {
    return dto.units;
  }
  return 0;
}

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
      amount: readGranularAmount(dto),
      description,
    };
  }

  return {
    period: dto.period ?? '',
    amount: readGranularAmount(dto),
    description,
  };
}

export function mapFundGranularRowToTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow {
  return {
    ...mapFundGranularRowToAmountTabRow(dto, timeframe),
    units: String(readGranularUnits(dto)),
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
