import {
  FundGranularRowDto,
  InvestorUnderlyingInvestmentDto,
  InvestorUnderlyingInvestmentTabRow,
} from '../models/api.models';

const EMPTY = '--';

function num(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readString(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return EMPTY;
}

function formatInvestmentDate(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return EMPTY;
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

function mapDto(
  dto: InvestorUnderlyingInvestmentDto | FundGranularRowDto,
): InvestorUnderlyingInvestmentTabRow {
  const record = dto as InvestorUnderlyingInvestmentDto & FundGranularRowDto;
  return {
    findCode: readString(record.findcode, record.findCode, record.fund_code),
    description: readString(record.description),
    investedAmount: num(record.invested_amount ?? record.investedAmount ?? record.amount),
    period: readString(record.period),
    date: formatInvestmentDate(record.date),
  };
}

export function mapInvestorUnderlyingInvestmentsToTabRows(
  items: Array<InvestorUnderlyingInvestmentDto | FundGranularRowDto> | null | undefined,
): InvestorUnderlyingInvestmentTabRow[] {
  return (items ?? []).map((item) => mapDto(item));
}
