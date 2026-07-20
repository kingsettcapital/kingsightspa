import { FundListItemDto, FundsListSummaryDto } from '../models/api.models';
import { investorInitials } from './investor-list-row.util';

export interface FundTableRow {
  fundKey: number;
  name: string;
  initials: string;
  avatarHue: number;
  fundType: string;
  strategy: string;
  strategyColor: string;
  commitment: number;
  investedPercent: number | null;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  releasedCapital: number;
}

const AVATAR_HUES = [210, 250, 170, 30, 340, 190, 280, 15];

const STRATEGY_COLORS: Record<string, string> = {
  income: '#00529B',
  growth: '#344033',
  mortgage: '#E7A614',
  urban: '#957695',
};

const DEFAULT_STRATEGY_COLOR = '#00529B';

function readRecord(dto: FundListItemDto): Record<string, unknown> {
  return dto as unknown as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readNumber(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function readNullableNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (value == null) {
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function strategyColor(strategy: string): string {
  const key = strategy.trim().toLowerCase();
  return STRATEGY_COLORS[key] ?? DEFAULT_STRATEGY_COLOR;
}

export function computeInvestedPercent(
  commitment: number,
  netInvestedCapital: number,
): number | null {
  if (!Number.isFinite(commitment) || commitment <= 0) {
    return null;
  }

  const raw = (netInvestedCapital / commitment) * 100;
  return Math.min(100, Math.max(0, raw));
}

export function formatInvestedPercent(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.round(value);
  return `${rounded}% invested`;
}

export function mapFundListItemToRow(dto: FundListItemDto, index: number): FundTableRow {
  const record = readRecord(dto);
  const name = readString(record, 'fundName', 'FundName', 'fund_name') || '—';
  const fundType =
    readString(
      record,
      'fund_type_name',
      'fundTypeName',
      'FundTypeName',
      'fundType',
      'FundType',
      'fund_type',
      'category',
      'Category',
    ) || '—';
  const strategy =
    readString(
      record,
      'fund_strategy_name',
      'fundStrategyName',
      'FundStrategyName',
      'strategy',
      'Strategy',
      'fund_strategy',
      'fundStrategy',
    ) || '—';
  const commitment = readNumber(
    record,
    'commitment_amount',
    'commitmentAmount',
    'commitment',
    'Commitment',
    'currentValue',
    'CurrentValue',
  );
  const netInvestedCapital = readNumber(
    record,
    'net_invested_capital_amount',
    'netInvestedCapital',
    'NetInvestedCapital',
    'net_invested_capital',
  );
  const netDistributed = readNumber(
    record,
    'net_distributed_amount',
    'netDistributed',
    'NetDistributed',
    'net_distributed',
  );
  const reservedUncalled = readNumber(
    record,
    'reserved_amount',
    'reservedUncalled',
    'ReservedUncalled',
    'reserved_uncalled',
  );
  const releasedCapital =
    readNullableNumber(
      record,
      'released_capital_amount',
      'releasedCapital',
      'ReleasedCapital',
      'released_capital',
    ) ?? 0;
  const resolvedCommitment = commitment || netInvestedCapital;
  const investedPercent =
    computeInvestedPercent(resolvedCommitment, netInvestedCapital) ??
    readNullableNumber(
      record,
      'invested_percent',
      'investedPercent',
      'InvestedPercent',
      'deployment_percent',
      'deploymentPercent',
    );

  return {
    fundKey: dto.fundKey,
    name,
    initials: investorInitials(name),
    avatarHue: AVATAR_HUES[index % AVATAR_HUES.length],
    fundType,
    strategy,
    strategyColor: strategyColor(strategy),
    commitment: resolvedCommitment,
    investedPercent,
    netInvestedCapital,
    netDistributed,
    reservedUncalled,
    releasedCapital,
  };
}

/** Build navigation state when opening investment detail from investor fund-exposure. */
export function fundTableRowFromFundExposure(input: {
  fundKey: number;
  fundName: string;
  commitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  releasedCapital: number;
  fundType?: string | null;
  strategy?: string | null;
  index?: number;
}): FundTableRow {
  const commitment = input.commitment || input.netInvestedCapital;
  const fundType = input.fundType?.trim() || '—';
  const strategy = input.strategy?.trim() || fundType;
  return {
    fundKey: input.fundKey,
    name: input.fundName,
    initials: investorInitials(input.fundName),
    avatarHue: AVATAR_HUES[(input.index ?? 0) % AVATAR_HUES.length],
    fundType,
    strategy,
    strategyColor: strategyColor(strategy),
    commitment,
    investedPercent: computeInvestedPercent(commitment, input.netInvestedCapital),
    netInvestedCapital: input.netInvestedCapital,
    netDistributed: input.netDistributed,
    reservedUncalled: input.reservedUncalled,
    releasedCapital: input.releasedCapital,
  };
}

export function extractFundsListSummary(result: unknown): FundsListSummaryDto | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as Record<string, unknown>;
  const summary = record['summary'] ?? record['Summary'];
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  const s = summary as Record<string, unknown>;
  const totalFunds = readNumber(s, 'total_funds', 'totalFunds', 'TotalFunds');
  const totalCommitment = readNumber(s, 'total_commitment', 'totalCommitment', 'TotalCommitment');
  const netInvestedCapital = readNumber(
    s,
    'net_invested_capital',
    'netInvestedCapital',
    'NetInvestedCapital',
  );
  const netDistributed = readNumber(s, 'net_distributed', 'netDistributed', 'NetDistributed');
  const reservedUncalled = readNumber(
    s,
    'reserved_uncalled',
    'reservedUncalled',
    'ReservedUncalled',
  );

  return {
    ...(totalFunds > 0 ? { totalFunds } : {}),
    totalCommitment,
    netInvestedCapital,
    netDistributed,
    reservedUncalled,
  };
}

export type FundsTableSortColumn =
  | 'fundName'
  | 'strategy'
  | 'commitment'
  | 'netInvestedCapital'
  | 'netDistributed'
  | 'reservedUncalled'
  | 'releasedCapital';

export type FundsTableSortDirection = 'asc' | 'desc';

/** API `sortBy` values for `GET /api/Funds` — must match response property names. */
export const FUNDS_TABLE_SORT_API_FIELDS: Record<FundsTableSortColumn, string> = {
  fundName: 'fundName',
  strategy: 'fund_strategy_name',
  commitment: 'commitment_amount',
  netInvestedCapital: 'net_invested_capital_amount',
  netDistributed: 'net_distributed_amount',
  reservedUncalled: 'reserved_amount',
  releasedCapital: 'released_capital_amount',
};

const NUMERIC_FUNDS_SORT_COLUMNS = new Set<FundsTableSortColumn>([
  'commitment',
  'netInvestedCapital',
  'netDistributed',
  'reservedUncalled',
  'releasedCapital',
]);

export function defaultFundsSortDirection(column: FundsTableSortColumn): FundsTableSortDirection {
  return NUMERIC_FUNDS_SORT_COLUMNS.has(column) ? 'desc' : 'asc';
}

export function buildFundsListCacheKey(filters: {
  view: string;
  dateKey: number | null;
  fundType: string;
  strategy: string;
  sortBy: string | null;
  sortDir: FundsTableSortDirection | null;
}): string {
  return [
    filters.view,
    filters.dateKey ?? '',
    filters.fundType,
    filters.strategy,
    filters.sortBy ?? '',
    filters.sortDir ?? '',
  ].join('|');
}
