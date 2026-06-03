import {
  FundNavDto,
  FundNavTabRow,
  FundNavTimeframe,
} from '../../../shared/models/api.models';
import { mapFundCommitmentsToTabRows } from '../commitments/fund-commitment.mapper';

export function mapFundNavToTabRows(
  items: FundNavDto[] | null | undefined,
  timeframe: FundNavTimeframe,
): FundNavTabRow[] {
  return mapFundCommitmentsToTabRows(items, timeframe);
}
