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

export function mapInvestorFundHoldingsToTabRows(
  items: InvestorFundHoldingDto[] | null | undefined,
): InvestorFundHoldingTabRow[] {
  return (items ?? []).map((dto) => ({
    fundKey: readFundKey(dto),
    fundName: readFundName(dto),
    since: formatSinceDate(dto.since),
    commitment: num(dto.commitment),
    unfunded: num(dto.unfunded),
    netInvested: num(dto.net_invested ?? dto.netInvested),
    distributed: num(dto.distributed),
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
