import {
  FundAmountTabRow,
  FundCommitmentDto,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundGranularRowDto,
} from '../../../shared/models/api.models';
import {
  mapFundCommitmentGranularRowToAmountTabRow,
  mapFundGranularRowToTabRow,
  mapFundInvestmentGranularRowToTabRow,
} from '../fund-granular-row.mapper';

export function mapFundCommitmentsToAmountTabRows(
  items: FundCommitmentDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundAmountTabRow[] {
  return (items ?? []).map((item) =>
    mapFundCommitmentGranularRowToAmountTabRow(item as FundGranularRowDto, timeframe),
  );
}

export function mapFundCommitmentsToTabRows(
  items: FundCommitmentDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow[] {
  return (items ?? []).map((item) =>
    mapFundInvestmentGranularRowToTabRow(item as FundGranularRowDto, timeframe),
  );
}
