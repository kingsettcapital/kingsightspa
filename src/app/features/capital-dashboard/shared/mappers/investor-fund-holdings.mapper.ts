import { InvestorFundHoldingDto, InvestorFundHoldingTabRow, InvestorFundHoldingsResponseDto } from '../models/api.models';

function num(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readFundKey(dto: InvestorFundHoldingDto): number {
  const candidates = [dto.fund_key, dto.fundKey];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function readFundName(dto: InvestorFundHoldingDto): string {
  const candidates = [dto.fund_name, dto.fundName];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '—';
}

function formatSinceDate(iso: string | null | undefined): string {
  const trimmed = iso?.trim();
  if (!trimmed) {
    return '—';
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function readOptionalAmount(...values: Array<number | null | undefined>): number {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readFundCode(dto: InvestorFundHoldingDto): string {
  const candidates = [dto.fund_code, dto.fundCode];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

function readFundType(dto: InvestorFundHoldingDto): string {
  const candidates = [dto.fund_type_name, dto.fundTypeName, dto.fund_type, dto.fundType];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function mapInvestorFundHoldingsToTabRows(
  items: InvestorFundHoldingDto[] | null | undefined,
): InvestorFundHoldingTabRow[] {
  return (items ?? []).map((dto) => ({
    fundKey: readFundKey(dto),
    fundCode: readFundCode(dto),
    fundName: readFundName(dto),
    fundType: readFundType(dto),
    since: formatSinceDate(dto.since),
    commitment: num(dto.commitment),
    netInvestedCapital: readOptionalAmount(
      dto.net_invested_capital,
      dto.netInvestedCapital,
      dto.net_invested,
      dto.netInvested,
    ),
    netDistributed: readOptionalAmount(dto.net_distributed, dto.netDistributed, dto.distributed),
    reservedUncalled: readOptionalAmount(dto.reserved_uncalled, dto.reservedUncalled, dto.reserved),
    unfunded: num(dto.unfunded),
    releasedCapital: readOptionalAmount(dto.released_capital, dto.releasedCapital, dto.released),
  }));
}

function readFundHoldingsDateKey(dto: InvestorFundHoldingsResponseDto): number | null {
  const raw = dto.date_key ?? dto.dateKey;
  if (raw == null || !Number.isFinite(Number(raw))) {
    return null;
  }
  return Number(raw);
}

export function mapInvestorFundHoldingsResponse(
  dto: InvestorFundHoldingsResponseDto | null | undefined,
): { dateKey: number | null; items: InvestorFundHoldingTabRow[] } {
  return {
    dateKey: dto ? readFundHoldingsDateKey(dto) : null,
    items: mapInvestorFundHoldingsToTabRows(dto?.items),
  };
}
