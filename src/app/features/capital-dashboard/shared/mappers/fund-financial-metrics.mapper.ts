import { FundFinancialMetricsDto } from '../models/api.models';

export interface FundFinancialMetricsRow {
  fundKey: number | null;
  fundCode: string;
  asOfDate: string | null;
  quarterYear: string | null;
  fundCashAtQuarterEnd: number | null;
  fundTotalAssetValue: number | null;
  fundDebt: number | null;
  fundEquity: number | null;
  fundNoi: number | null;
  fundFfo: number | null;
  fundNcf: number | null;
  fundCapex: number | null;
  fundNavAmount: number | null;
  fundEbitda: number | null;
  fundRevenue: number | null;
  fundExpense: number | null;
  fundGrossMarketValue: number | null;
  fundGavAmount: number | null;
  /** Display percent (0–100). */
  fundLtv: number | null;
  jvPartnersCount: number | null;
  jvInvestmentsAmount: number | null;
  /** Display percent (0–100). */
  jvInvestmentsPctOfGav: number | null;
  assetHeldCount: number | null;
  propertyHeldCount: number | null;
}

function readString(dto: FundFinancialMetricsDto, snake: string, camel: string): string {
  const record = dto as Record<string, unknown>;
  const value = record[snake] ?? record[camel];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(dto: FundFinancialMetricsDto, snake: string, camel: string): number | null {
  const record = dto as Record<string, unknown>;
  const value = record[snake] ?? record[camel];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

/** Warehouse ratios (0–1) → display percent; values already > 1 left as-is. */
function asDisplayPercent(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.abs(value) <= 1 ? value * 100 : value;
}

function readDate(dto: FundFinancialMetricsDto): string | null {
  const record = dto as Record<string, unknown>;
  const value = record['as_of_date'] ?? record['asOfDate'];
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value.trim();
  }
  return new Date(parsed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapFundFinancialMetricsToRow(
  dto: FundFinancialMetricsDto | null | undefined,
): FundFinancialMetricsRow | null {
  if (!dto) {
    return null;
  }

  return {
    fundKey: readNumber(dto, 'fund_key', 'fundKey'),
    fundCode: readString(dto, 'fund_code', 'fundCode'),
    asOfDate: readDate(dto),
    quarterYear: readString(dto, 'quarter_year', 'quarterYear') || null,
    fundCashAtQuarterEnd: readNumber(dto, 'fund_cash_at_quarter_end', 'fundCashAtQuarterEnd'),
    fundTotalAssetValue: readNumber(dto, 'fund_total_asset_value', 'fundTotalAssetValue'),
    fundDebt: readNumber(dto, 'fund_debt', 'fundDebt'),
    fundEquity: readNumber(dto, 'fund_equity', 'fundEquity'),
    fundNoi: readNumber(dto, 'fund_noi', 'fundNoi'),
    fundFfo: readNumber(dto, 'fund_ffo', 'fundFfo'),
    fundNcf: readNumber(dto, 'fund_ncf', 'fundNcf'),
    fundCapex: readNumber(dto, 'fund_capex', 'fundCapex'),
    fundNavAmount: readNumber(dto, 'fund_nav_amount', 'fundNavAmount'),
    fundEbitda: readNumber(dto, 'fund_ebitda', 'fundEbitda'),
    fundRevenue: readNumber(dto, 'fund_revenue', 'fundRevenue'),
    fundExpense: readNumber(dto, 'fund_expense', 'fundExpense'),
    fundGrossMarketValue: readNumber(dto, 'fund_gross_market_value', 'fundGrossMarketValue'),
    fundGavAmount: readNumber(dto, 'fund_gav_amount', 'fundGavAmount'),
    fundLtv: asDisplayPercent(readNumber(dto, 'fund_ltv', 'fundLtv')),
    jvPartnersCount: readNumber(dto, 'jv_partners_count', 'jvPartnersCount'),
    jvInvestmentsAmount: readNumber(dto, 'jv_investments_amount', 'jvInvestmentsAmount'),
    jvInvestmentsPctOfGav: asDisplayPercent(
      readNumber(dto, 'jv_investments_pct_of_gav', 'jvInvestmentsPctOfGav'),
    ),
    assetHeldCount: readNumber(dto, 'asset_held_count', 'assetHeldCount'),
    propertyHeldCount: readNumber(dto, 'property_held_count', 'propertyHeldCount'),
  };
}
