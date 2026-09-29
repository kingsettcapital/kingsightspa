import { LoanApiRecord } from '../interfaces/loan.interfaces';
import { LoanRankingRow } from '../interfaces/loan-table.interfaces';

const STATUS_FILTER_TO_LABEL: Record<string, string | null> = {
  ACTIVE_SYNDICATE: 'ACTIVE',
  SETTLED: 'SETTLED',
  DELINQUENT: 'DELINQUENT',
  ALL: null,
};

export function mapStatusFilterToLabel(statusFilter: string): string | null {
  return STATUS_FILTER_TO_LABEL[statusFilter] ?? null;
}

export function filterRowsByStatuses(
  rows: LoanRankingRow[],
  statusFilters?: string[],
): LoanRankingRow[] {
  if (!statusFilters?.length || statusFilters.includes('ALL')) {
    return rows;
  }

  const labels = new Set(
    statusFilters
      .map((filter) => mapStatusFilterToLabel(filter))
      .filter((label): label is string => label !== null),
  );

  if (!labels.size) {
    return rows;
  }

  return rows.filter((row) => labels.has(row.status));
}

export function mapApiLoanToRow(record: LoanApiRecord, index: number): LoanRankingRow {
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanCode = getRecordValue(record, ['loanCode', 'LoanCode', 'loanId', 'LoanId']);
  const investorName = getRecordValue(record, [
    'investorName',
    'InvestorName',
    'investor',
    'Investor',
    'clientName',
    'ClientName',
  ]);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
    'loanName',
    'LoanName',
  ]);
  const loanAlias = getRecordValue(record, [
    'loanAlias',
    'LoanAlias',
    'loanAliasName',
    'LoanAliasName',
    'alias',
    'Alias',
  ]);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'dateUpdated',
    'DateUpdated',
    'userUpdatedDate',
    'UserUpdatedDate',
    'updatedOn',
    'UpdatedOn',
    'lastUpdated',
    'LastUpdated',
  ]);
  const updatedBy = getRecordValue(record, [
    'updatedBy',
    'UpdatedBy',
    'userUpdatedBy',
    'UserUpdatedBy',
    'modifiedBy',
    'ModifiedBy',
    'createdBy',
    'CreatedBy',
  ]);
  const lateInterestOffNote = getRecordValue(record, [
    'lateInterestOffNote',
    'LateInterestOffNote',
  ]);
  const aliasOptionsRaw = getRecordValue(record, ['loanAliasOptions', 'LoanAliasOptions']);
  const resolvedLoanKey = loanKey || loanCode || `ln-${index + 1}`;
  const normalizedLoanKey = String(resolvedLoanKey);
  const resolvedLoanId = (loanCode || loanKey || normalizedLoanKey).toLowerCase();
  const resolvedAlias = loanAlias;
  const aliasOptions = parseAliasOptions(aliasOptionsRaw, resolvedAlias);
  const ranking = getRecordNumber(record, [
    'ranking',
    'Ranking',
    'loanRanking',
    'LoanRanking',
    'rank',
    'Rank',
  ], 1);

  return {
    loanKey: normalizedLoanKey,
    loanId: resolvedLoanId,
    loanDescription: loanDescription || '-',
    loanAlias: resolvedAlias,
    loanAliasOptions: aliasOptions,
    investorName: investorName || '-',
    ranking,
    dummyLoanIdentifier: getRecordBoolean(record, [
      'dummyLoanIdentifier',
      'DummyLoanIdentifier',
    ]),
    lateInterestApplicable: getRecordBoolean(record, [
      'lateInterestApplicable',
      'LateInterestApplicable',
    ]),
    lateInterestOffNote: lateInterestOffNote,
    status: getRecordValue(record, ['status', 'Status']).toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

export function createEmptyLoanRow(): LoanRankingRow {
  const stamp = Date.now();
  return {
    loanKey: `new-${stamp}`,
    loanId: '',
    loanDescription: '',
    loanAlias: '',
    loanAliasOptions: [''],
    investorName: '',
    ranking: 1,
    dummyLoanIdentifier: false,
    lateInterestApplicable: false,
    lateInterestOffNote: '',
    status: 'ACTIVE',
    dateDwhUpdate: new Date().toISOString().slice(0, 10),
    updatedBy: '-',
    isNew: true,
  };
}

function parseAliasOptions(raw: string, currentAlias: string): string[] {
  const options = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (options.length === 0) {
    return currentAlias ? [currentAlias] : [];
  }

  if (currentAlias && !options.includes(currentAlias)) {
    return [currentAlias, ...options];
  }

  return options;
}

function getRecordBoolean(record: LoanApiRecord, keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }
  return false;
}

function getRecordNumber(record: LoanApiRecord, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function getRecordValue(record: LoanApiRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeDate(value: string): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
}
