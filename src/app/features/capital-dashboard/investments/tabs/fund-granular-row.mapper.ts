import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundGranularRowDto,
} from '../../shared/models/api.models';

function readGranularFundCode(dto: FundGranularRowDto): string {
  return dto.fund_code?.trim() ?? '';
}

function readCommitmentAmount(dto: FundGranularRowDto): number {
  const candidates = [dto.commitment_amount, dto.amount];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readInvestedAmount(dto: FundGranularRowDto): number {
  const candidates = [dto.invested_amount, dto.amount];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readGranularAmount(dto: FundGranularRowDto): number {
  const candidates = [dto.amount, dto.invested_amount, dto.distributed_amount, dto.commitment_amount];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function commitmentDescription(dto: FundGranularRowDto): string {
  const fromApi = dto.description?.trim();
  if (fromApi) return fromApi;
  const period = dto.period?.trim();
  if (!period || period.toUpperCase() === 'LTD') return '';
  return `${period} Commitment`;
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
  amountReader: (row: FundGranularRowDto) => number = readGranularAmount,
  descriptionReader: (row: FundGranularRowDto) => string = (row) => row.description ?? '',
): FundAmountTabRow {
  const description = descriptionReader(dto);
  const fundCode = readGranularFundCode(dto);

  if (timeframe === 'daily' && dto.date) {
    return {
      fundCode,
      date: formatGranularDate(dto.date),
      amount: amountReader(dto),
      description,
    };
  }

  return {
    fundCode,
    period: dto.period ?? '',
    amount: amountReader(dto),
    description,
  };
}

export function mapFundCommitmentGranularRowToAmountTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundAmountTabRow {
  return mapFundGranularRowToAmountTabRow(
    dto,
    timeframe,
    readCommitmentAmount,
    commitmentDescription,
  );
}

export function mapFundInvestmentGranularRowToTabRow(
  dto: FundGranularRowDto,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow {
  return {
    ...mapFundGranularRowToAmountTabRow(dto, timeframe, readInvestedAmount),
    units: String(readGranularUnits(dto)),
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
