import { FundGranularRowDto, FundNavTabRow, FundNavTimeframe } from '../../../shared/models/api.models';
import { mapFundGranularRowsToTabRows } from '../fund-granular-row.mapper';

export function mapFundNavToTabRows(
  items: FundGranularRowDto[] | null | undefined,
  timeframe: FundNavTimeframe,
): FundNavTabRow[] {
  return mapFundGranularRowsToTabRows(items, timeframe);
}
