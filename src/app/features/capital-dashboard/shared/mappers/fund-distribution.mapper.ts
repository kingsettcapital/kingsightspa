import {
  FundCommitmentTimeframe,
  FundDistributionGroupDto,
  FundDistributionGroupTabRow,
  FundDistributionPeriodRowDto,
  FundDistributionPeriodTabRow,
} from '../models/api.models';
import {
  coerceTabTableRows,
  investmentDetailTabRowSearchText,
  parseTabUnits,
} from '../utils/investment-detail-tab.util';

function formatDistributionDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function readPeriodAmount(dto: FundDistributionPeriodRowDto): number {
  return typeof dto.amount === 'number' && Number.isFinite(dto.amount) ? dto.amount : 0;
}

function readPeriodUnits(dto: FundDistributionPeriodRowDto): number {
  return typeof dto.units === 'number' && Number.isFinite(dto.units) ? dto.units : 0;
}

export function mapFundDistributionPeriodToTabRow(
  dto: FundDistributionPeriodRowDto,
  timeframe: FundCommitmentTimeframe,
): FundDistributionPeriodTabRow {
  const description = dto.description ?? '';

  if (timeframe === 'daily' && dto.date) {
    return {
      date: formatDistributionDate(dto.date),
      amount: readPeriodAmount(dto),
      units: String(readPeriodUnits(dto)),
      description,
    };
  }

  return {
    period: dto.period ?? '',
    amount: readPeriodAmount(dto),
    units: String(readPeriodUnits(dto)),
    description,
  };
}

export function mapFundDistributionGroupToTabRow(
  dto: FundDistributionGroupDto,
  index: number,
  timeframe: FundCommitmentTimeframe,
): FundDistributionGroupTabRow {
  const transactionType = dto.transaction_type?.trim() || '—';
  const fundCode = dto.fund_code?.trim() ?? '';
  const investorCode = dto.investor_code?.trim() ?? '';
  const groupKey = `${index}\u0000${fundCode}\u0000${investorCode}\u0000${transactionType}`;
  const totalAmount =
    typeof dto.total_amount === 'number' && Number.isFinite(dto.total_amount)
      ? dto.total_amount
      : 0;
  const totalUnits =
    typeof dto.total_units === 'number' && Number.isFinite(dto.total_units)
      ? dto.total_units
      : 0;

  return {
    groupKey,
    fundCode,
    transactionType,
    totalAmount,
    totalUnits: String(totalUnits),
    periods: (dto.periods ?? []).map((period) =>
      mapFundDistributionPeriodToTabRow(period, timeframe),
    ),
  };
}

export function mapFundDistributionGroupsToTabRows(
  items: FundDistributionGroupDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
  startIndex = 0,
): FundDistributionGroupTabRow[] {
  return (items ?? []).map((item, index) =>
    mapFundDistributionGroupToTabRow(item, startIndex + index, timeframe),
  );
}

export function filterFundDistributionGroups(
  groups: FundDistributionGroupTabRow[] | null | undefined,
  searchQuery: string,
): FundDistributionGroupTabRow[] {
  const source = coerceTabTableRows(groups);
  const q = searchQuery.trim().toLowerCase();
  if (!q) return source;

  return source.filter((group) => {
    if (group.transactionType.toLowerCase().includes(q)) {
      return true;
    }
    return group.periods.some((period) =>
      investmentDetailTabRowSearchText(period).toLowerCase().includes(q),
    );
  });
}

export function sumFundDistributionGroups(groups: FundDistributionGroupTabRow[] | null | undefined): {
  totalAmount: number;
  totalUnits: number;
} {
  return coerceTabTableRows(groups).reduce(
    (acc, group) => ({
      totalAmount: acc.totalAmount + group.totalAmount,
      totalUnits: acc.totalUnits + parseTabUnits(group.totalUnits),
    }),
    { totalAmount: 0, totalUnits: 0 },
  );
}

export function flattenFundDistributionGroupsForExport(
  groups: FundDistributionGroupTabRow[],
): Array<FundDistributionPeriodTabRow & { transactionType: string }> {
  const rows: Array<FundDistributionPeriodTabRow & { transactionType: string }> = [];
  for (const group of groups) {
    for (const period of group.periods) {
      rows.push({ transactionType: group.transactionType, ...period });
    }
  }
  return rows;
}
