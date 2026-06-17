import { InvestorListItemDto, InvestorsListSummaryDto } from '../models/api.models';
import { kingsettAvatarColor } from './kingsett-avatar-colors.util';

export interface InvestorTableRow {
  investorKey: number;
  name: string;
  initials: string;
  avatarBackground: string;
  avatarColor: string;
  investorType: string;
  relationship: string;
  fundsCount: number;
  commitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  unfunded: number;
  releasedCapital: number | null;
  contactName: string;
  address: string;
}

function readRecord(dto: InvestorListItemDto): Record<string, unknown> {
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

export function investorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function readInvestorKey(record: Record<string, unknown>, dto: InvestorListItemDto): number {
  const fromRecord = readNumber(record, 'investor_key', 'investorKey', 'InvestorKey');
  if (fromRecord > 0) {
    return fromRecord;
  }
  return dto.investorKey;
}

export function mapInvestorListItemToRow(dto: InvestorListItemDto, index: number): InvestorTableRow {
  const record = readRecord(dto);
  const name =
    readString(record, 'investor_name', 'investorName', 'InvestorName', 'name', 'Name') || '—';
  const investorType =
    readString(
      record,
      'investor_type',
      'investor_type_name',
      'investorType',
      'InvestorType',
      'InvestorTypeName',
    ) || '—';
  const relationship = readString(
    record,
    'relationship_name',
    'relationshipName',
    'RelationshipName',
    'relationship',
    'Relationship',
  );
  const fundsCount = readNumber(record, 'fund_count', 'fundsCount', 'FundsCount', 'funds', 'Funds');
  const commitment = readNumber(
    record,
    'commitment_amount',
    'commitment',
    'Commitment',
    'totalCommitment',
    'TotalCommitment',
  );
  const netInvestedCapital = readNumber(
    record,
    'net_invested_capital_amount',
    'netInvestedCapital',
    'NetInvestedCapital',
    'totalInvested',
    'TotalInvested',
  );
  const netDistributed = readNumber(
    record,
    'net_distributed_amount',
    'netDistributed',
    'NetDistributed',
    'netDistributedLtd',
    'NetDistributedLtd',
  );
  const reservedUncalled = readNumber(
    record,
    'reserved_amount',
    'reserved_uncalled',
    'reservedUncalled',
    'ReservedUncalled',
  );
  const unfunded = readNumber(
    record,
    'unfunded_amount',
    'unfundedAmount',
    'UnfundedAmount',
    'unfunded',
    'Unfunded',
  );
  const releasedCapital = readNullableNumber(
    record,
    'released_capital_amount',
    'releasedCapital',
    'ReleasedCapital',
  );
  const contactFirst = readString(record, 'contact_first_name', 'contactFirstName', 'ContactFirstName');
  const contactLast = readString(record, 'contact_last_name', 'contactLastName', 'ContactLastName');
  const contactName =
    readString(record, 'contactName', 'ContactName', 'contact', 'Contact') ||
    [contactFirst, contactLast].filter(Boolean).join(' ').trim();
  const address = formatAddressFromRecord(record);

  const avatar = kingsettAvatarColor(index);

  return {
    investorKey: readInvestorKey(record, dto),
    name,
    initials: investorInitials(name),
    avatarBackground: avatar.background,
    avatarColor: avatar.color,
    investorType,
    relationship: relationship || '—',
    fundsCount,
    commitment: commitment || netInvestedCapital,
    netInvestedCapital,
    netDistributed,
    reservedUncalled,
    unfunded,
    releasedCapital,
    contactName: contactName || '—',
    address,
  };
}

function formatAddressFromRecord(record: Record<string, unknown>): string {
  const line1 = readString(record, 'address_line1', 'addressLine1', 'AddressLine1');
  const line2 = readString(record, 'address_line2', 'addressLine2', 'AddressLine2');
  const city = readString(record, 'city', 'City');
  const provinceCode = readString(record, 'province_code', 'provinceCode', 'ProvinceCode');
  const province = readString(record, 'province', 'Province');
  const region = provinceCode || province;
  const parts: string[] = [];

  if (line1) {
    parts.push(line1);
  }
  if (line2) {
    parts.push(line2);
  }

  const cityLine = [city, region].filter(Boolean).join(', ');
  if (cityLine) {
    parts.push(cityLine);
  }

  return parts.join('\n');
}

export function extractInvestorsListSummary(result: unknown): InvestorsListSummaryDto | null {
  if (!result || typeof result !== 'object') {
    return null;
  }

  const record = result as Record<string, unknown>;
  const summary = record['summary'] ?? record['Summary'];
  if (!summary || typeof summary !== 'object') {
    return null;
  }

  const s = summary as Record<string, unknown>;
  const totalInvestors = readNumber(s, 'total_investors', 'totalInvestors', 'TotalInvestors');
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
    'reserved_amount',
    'reservedAmount',
  );
  const unfunded = readNumber(s, 'unfunded', 'Unfunded', 'unfunded_amount', 'unfundedAmount');
  const releasedCapital = readNumber(
    s,
    'released_capital',
    'releasedCapital',
    'ReleasedCapital',
    'released_capital_amount',
    'releasedCapitalAmount',
  );

  return {
    ...(totalInvestors > 0 ? { totalInvestors } : {}),
    totalCommitment,
    netInvestedCapital,
    netDistributed,
    reservedUncalled,
    unfunded,
    releasedCapital,
  };
}

export type InvestorsTableSortColumn =
  | 'investorName'
  | 'relationship'
  | 'fundsCount'
  | 'commitment'
  | 'netInvestedCapital'
  | 'netDistributed'
  | 'reservedUncalled'
  | 'releasedCapital';

export type InvestorsTableSortDirection = 'asc' | 'desc';

/** API `sortBy` values for `GET /api/CapitalInvestors` — must match response property names. */
export const INVESTORS_TABLE_SORT_API_FIELDS: Record<InvestorsTableSortColumn, string> = {
  investorName: 'investor_name',
  relationship: 'relationship_name',
  fundsCount: 'fund_count',
  commitment: 'commitment_amount',
  netInvestedCapital: 'net_invested_capital_amount',
  netDistributed: 'net_distributed_amount',
  reservedUncalled: 'reserved_amount',
  releasedCapital: 'released_capital_amount',
};

const NUMERIC_INVESTORS_SORT_COLUMNS = new Set<InvestorsTableSortColumn>([
  'fundsCount',
  'commitment',
  'netInvestedCapital',
  'netDistributed',
  'reservedUncalled',
  'releasedCapital',
]);

export function defaultInvestorsSortDirection(
  column: InvestorsTableSortColumn,
): InvestorsTableSortDirection {
  return NUMERIC_INVESTORS_SORT_COLUMNS.has(column) ? 'desc' : 'asc';
}

export function buildInvestorsListCacheKey(filters: {
  view: string;
  dateKey: number | null;
  investorType: string;
  relationship: string;
  sortBy: string | null;
  sortDir: InvestorsTableSortDirection | null;
}): string {
  return [
    filters.view,
    filters.dateKey ?? '',
    filters.investorType,
    filters.relationship,
    filters.sortBy ?? '',
    filters.sortDir ?? '',
  ].join('|');
}
