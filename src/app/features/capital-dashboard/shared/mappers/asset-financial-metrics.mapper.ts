import { AssetFinancialMetricsDto } from '../models/api.models';

export interface AssetFinancialMetricsRow {
  fundCode: string;
  assetKey: number | null;
  assetCode: string;
  assetName: string;
  asOfDate: string | null;
  quarterYear: string | null;
  assetKsOwnershipPct: number | null;
  assetJvPartner: string;
  assetJvPct: number | null;
  assetCashAtQuarterEnd: number | null;
  assetTotalAssetValue: number | null;
  assetDebt: number | null;
  assetEquity: number | null;
  assetNoi: number | null;
  assetPriorYearSamePeriod: number | null;
  assetPriorYearEndNoi: number | null;
  assetFfo: number | null;
  assetCapex: number | null;
  assetNavAmount: number | null;
  assetGrossMarketValue: number | null;
  assetGavAmount: number | null;
  assetNetIncome: number | null;
  assetLtv: number | null;
  assetCapexPctNoi: number | null;
  totalNoiGrowthAmount: number | null;
  totalNoiGrowthPct: number | null;
  currentCostAmount: number | null;
  budgetedNoiCurrentYear: number | null;
  forecastedNoiCurrentYear: number | null;
}

function readString(dto: AssetFinancialMetricsDto, snake: string, camel: string): string {
  const record = dto as Record<string, unknown>;
  const value = record[snake] ?? record[camel];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(dto: AssetFinancialMetricsDto, snake: string, camel: string): number | null {
  const record = dto as Record<string, unknown>;
  const value = record[snake] ?? record[camel];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function readDate(dto: AssetFinancialMetricsDto): string | null {
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

export function mapAssetFinancialMetricsToRow(
  dto: AssetFinancialMetricsDto | null | undefined,
): AssetFinancialMetricsRow | null {
  if (!dto) {
    return null;
  }

  return {
    fundCode: readString(dto, 'fund_code', 'fundCode'),
    assetKey: readNumber(dto, 'asset_key', 'assetKey'),
    assetCode: readString(dto, 'asset_code', 'assetCode'),
    assetName: readString(dto, 'asset_name', 'assetName'),
    asOfDate: readDate(dto),
    quarterYear: readString(dto, 'quarter_year', 'quarterYear') || null,
    assetKsOwnershipPct: readNumber(dto, 'asset_ks_ownership_pct', 'assetKsOwnershipPct'),
    assetJvPartner: readString(dto, 'asset_jv_partner', 'assetJvPartner'),
    assetJvPct: readNumber(dto, 'asset_jv_pct', 'assetJvPct'),
    assetCashAtQuarterEnd: readNumber(dto, 'asset_cash_at_quarter_end', 'assetCashAtQuarterEnd'),
    assetTotalAssetValue: readNumber(dto, 'asset_total_asset_value', 'assetTotalAssetValue'),
    assetDebt: readNumber(dto, 'asset_debt', 'assetDebt'),
    assetEquity: readNumber(dto, 'asset_equity', 'assetEquity'),
    assetNoi: readNumber(dto, 'asset_noi', 'assetNoi'),
    assetPriorYearSamePeriod: readNumber(
      dto,
      'asset_prior_year_same_period',
      'assetPriorYearSamePeriod',
    ),
    assetPriorYearEndNoi: readNumber(dto, 'asset_prior_year_end_noi', 'assetPriorYearEndNoi'),
    assetFfo: readNumber(dto, 'asset_ffo', 'assetFfo'),
    assetCapex: readNumber(dto, 'asset_capex', 'assetCapex'),
    assetNavAmount: readNumber(dto, 'asset_nav_amount', 'assetNavAmount'),
    assetGrossMarketValue: readNumber(dto, 'asset_gross_market_value', 'assetGrossMarketValue'),
    assetGavAmount: readNumber(dto, 'asset_gav_amount', 'assetGavAmount'),
    assetNetIncome: readNumber(dto, 'asset_net_income', 'assetNetIncome'),
    assetLtv: readNumber(dto, 'asset_ltv', 'assetLtv'),
    assetCapexPctNoi: readNumber(dto, 'asset_capex_pct_noi', 'assetCapexPctNoi'),
    totalNoiGrowthAmount: readNumber(dto, 'total_noi_growth_amount', 'totalNoiGrowthAmount'),
    totalNoiGrowthPct: readNumber(dto, 'total_noi_growth_pct', 'totalNoiGrowthPct'),
    currentCostAmount:
      readNumber(dto, 'current_cost_amount', 'currentCostAmount') ??
      readNumber(dto, 'current_cost_book_value', 'currentCostBookValue'),
    budgetedNoiCurrentYear: readNumber(dto, 'budgeted_noi_current_year', 'budgetedNoiCurrentYear'),
    forecastedNoiCurrentYear: readNumber(
      dto,
      'forecasted_noi_current_year',
      'forecastedNoiCurrentYear',
    ),
  };
}
