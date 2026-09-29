import { FundGranularRowDto, FundNavTabRow, FundNavTimeframe } from '../models/api.models';
import { mapFundGranularRowsToAmountTabRows } from './fund-granular-row.mapper';

export function mapFundNavToTabRows(
  items: FundGranularRowDto[] | null | undefined,
  timeframe: FundNavTimeframe,
): FundNavTabRow[] {
  return mapFundGranularRowsToAmountTabRows(items, timeframe);
}
