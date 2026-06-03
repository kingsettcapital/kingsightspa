import {
  FundCommitmentDto,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundGranularRowDto,
} from '../../../shared/models/api.models';
import { mapFundGranularRowToTabRow } from '../fund-granular-row.mapper';

export function mapFundCommitmentsToTabRows(
  items: FundCommitmentDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow[] {
  return (items ?? []).map((item) => mapFundGranularRowToTabRow(item as FundGranularRowDto, timeframe));
}
