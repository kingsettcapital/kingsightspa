import { AssetFinancialMetricsDto } from '../models/api.models';

export interface AssetFinancialMetricsRow {
  fundCode: string;
  assetKey: number | null;
  assetCode: string;
  assetName: string;
  asOfDate: string | null;
  assetKsOwnershipPct: number | null;
  assetCashAtQuarterEnd: number | null;
  assetTotalAssetValue: number | null;
  assetDebt: number | null;
  assetEquity: number | null;
  assetNoi: number | null;
  assetFfo: number | null;
  assetNcf: number | null;
  assetCapex: number | null;
  assetNavAmount: number | null;
  assetEbitda: number | null;
  assetRevenue: number | null;
  assetExpense: number | null;
  assetGrossMarketValue: number | null;
  assetGavAmount: number | null;
  assetLtv: number | null;
  assetAffo: number | null;
  assetCapexPctNoi: number | null;
  totalNoiGrowthAmount: number | null;
  totalNoiGrowthPct: number | null;
  sameStoreNoiGrowthAmount: number | null;
  sameStoreNoiGrowthPct: number | null;
  currentCostAmount: number | null;
  costBasisAmount: number | null;
  budgetedNoiCurrentYear: number | null;
  forecastedNoiCurrentYear: number | null;
  budgetedFfo: number | null;
  forecastedFfo: number | null;
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
    assetKsOwnershipPct: readNumber(dto, 'asset_ks_ownership_pct', 'assetKsOwnershipPct'),
    assetCashAtQuarterEnd: readNumber(dto, 'asset_cash_at_quarter_end', 'assetCashAtQuarterEnd'),
    assetTotalAssetValue: readNumber(dto, 'asset_total_asset_value', 'assetTotalAssetValue'),
    assetDebt: readNumber(dto, 'asset_debt', 'assetDebt'),
    assetEquity: readNumber(dto, 'asset_equity', 'assetEquity'),
    assetNoi: readNumber(dto, 'asset_noi', 'assetNoi'),
    assetFfo: readNumber(dto, 'asset_ffo', 'assetFfo'),
    assetNcf: readNumber(dto, 'asset_ncf', 'assetNcf'),
    assetCapex: readNumber(dto, 'asset_capex', 'assetCapex'),
    assetNavAmount: readNumber(dto, 'asset_nav_amount', 'assetNavAmount'),
    assetEbitda: readNumber(dto, 'asset_ebitda', 'assetEbitda'),
    assetRevenue: readNumber(dto, 'asset_revenue', 'assetRevenue'),
    assetExpense: readNumber(dto, 'asset_expense', 'assetExpense'),
    assetGrossMarketValue: readNumber(dto, 'asset_gross_market_value', 'assetGrossMarketValue'),
    assetGavAmount: readNumber(dto, 'asset_gav_amount', 'assetGavAmount'),
    assetLtv: readNumber(dto, 'asset_ltv', 'assetLtv'),
    assetAffo: readNumber(dto, 'asset_affo', 'assetAffo'),
    assetCapexPctNoi: readNumber(dto, 'asset_capex_pct_noi', 'assetCapexPctNoi'),
    totalNoiGrowthAmount: readNumber(dto, 'total_noi_growth_amount', 'totalNoiGrowthAmount'),
    totalNoiGrowthPct: readNumber(dto, 'total_noi_growth_pct', 'totalNoiGrowthPct'),
    sameStoreNoiGrowthAmount: readNumber(
      dto,
      'same_store_noi_growth_amount',
      'sameStoreNoiGrowthAmount',
    ),
    sameStoreNoiGrowthPct: readNumber(dto, 'same_store_noi_growth_pct', 'sameStoreNoiGrowthPct'),
    currentCostAmount: readNumber(dto, 'current_cost_amount', 'currentCostAmount'),
    costBasisAmount: readNumber(dto, 'cost_basis_amount', 'costBasisAmount'),
    budgetedNoiCurrentYear: readNumber(dto, 'budgeted_noi_current_year', 'budgetedNoiCurrentYear'),
    forecastedNoiCurrentYear: readNumber(
      dto,
      'forecasted_noi_current_year',
      'forecastedNoiCurrentYear',
    ),
    budgetedFfo: readNumber(dto, 'budgeted_ffo', 'budgetedFfo'),
    forecastedFfo: readNumber(dto, 'forecasted_ffo', 'forecastedFfo'),
  };
}
