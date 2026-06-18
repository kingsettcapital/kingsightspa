import {
  InvestorCapitalActivityDto,
  InvestorCapitalActivityTabRow,
  InvestorCapitalObligationDto,
  InvestorCapitalObligationTabRow,
  InvestorNetAssetDto,
  InvestorNetAssetTabRow,
  InvestorDistributionTableDto,
  InvestorDistributionTableTabRow,
  InvestorIrrDto,
  InvestorIrrTabRow,
} from '../models/api.models';

function num(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function optNum(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function code(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

function name(...values: Array<string | null | undefined>): string {
  return code(...values) || '—';
}

function transactionType(...values: Array<string | null | undefined>): string {
  return code(...values) || '—';
}

export function mapInvestorCapitalActivitiesToTabRows(
  items: InvestorCapitalActivityDto[] | null | undefined,
): InvestorCapitalActivityTabRow[] {
  return (items ?? []).map((dto) => ({
    fundCode: code(dto.fund_code, dto.fundCode),
    fundName: name(dto.fund_name, dto.fundName),
    type: transactionType(dto.type),
    called: num(dto.called),
    transferIn: num(dto.transfer_in ?? dto.transferIn),
    transferOut: num(dto.transfer_out ?? dto.transferOut),
    redemption: num(dto.redemption),
  }));
}

export function mapInvestorDistributionTableToTabRows(
  items: InvestorDistributionTableDto[] | null | undefined,
): InvestorDistributionTableTabRow[] {
  return (items ?? []).map((dto) => ({
    fundCode: code(dto.fund_code, dto.fundCode),
    fundName: name(dto.fund_name, dto.fundName),
    type: transactionType(dto.type),
    preferredReturn: num(dto.preferred_return ?? dto.preferredReturn),
    committed: num(dto.committed),
    unfunded: num(dto.unfunded),
    cashDist: num(dto.cash_dist ?? dto.cashDist),
    gainDist: num(dto.gain_dist ?? dto.gainDist),
    returnOfCapital: num(dto.return_of_capital ?? dto.returnOfCapital),
    released: num(dto.released),
  }));
}

export function mapInvestorIrrToTabRows(
  items: InvestorIrrDto[] | null | undefined,
): InvestorIrrTabRow[] {
  return (items ?? []).map((dto) => ({
    fundCode: code(dto.fund_code, dto.fundCode),
    fundName: name(dto.fund_name, dto.fundName),
    type: transactionType(dto.type),
    irr1Year: optNum(dto.irr_1_year_pct),
    irr3Year: optNum(dto.irr_3_year_pct),
    irr5Year: optNum(dto.irr_5_year_pct),
    irr7Year: optNum(dto.irr_7_year_pct),
    irr10Year: optNum(dto.irr_10_year_pct),
    irrLtd: optNum(dto.irr_ltd_pct),
  }));
}

export function mapInvestorCapitalObligationsToTabRows(
  items: InvestorCapitalObligationDto[] | null | undefined,
): InvestorCapitalObligationTabRow[] {
  return (items ?? []).map((dto) => {
    const fundKey = dto.fund_key ?? dto.fundKey;
    return {
      fundKey: typeof fundKey === 'number' && Number.isFinite(fundKey) ? fundKey : null,
      fundCode: code(dto.fund_code, dto.fundCode),
      fundName: name(dto.fund_name, dto.fundName),
      period: code(dto.quarter_year, dto.quarterYear) || '—',
      type: transactionType(dto.type),
      amount: num(dto.amount),
    };
  });
}

export function mapInvestorNetAssetsToTabRows(
  items: InvestorNetAssetDto[] | null | undefined,
): InvestorNetAssetTabRow[] {
  return (items ?? []).map((dto) => {
    const fundKey = dto.fund_key ?? dto.fundKey;
    return {
      fundKey: typeof fundKey === 'number' && Number.isFinite(fundKey) ? fundKey : null,
      fundCode: code(dto.fund_code, dto.fundCode),
      fundName: name(dto.fund_name, dto.fundName),
      period: code(dto.quarter_year, dto.quarterYear) || '—',
      type: transactionType(dto.type),
      ret: optNum(dto.ret),
    };
  });
}
