import { LOANS_RANKING_EXAMPLE_DATA } from '../constants/loans-ranking-example.data';
import { LoanApiRecord } from '../interfaces/loan.interfaces';
import {
  LoanRankingRow,
  LoanTableQuery,
  LoanTableResult,
} from '../interfaces/loan-table.interfaces';
import { filterRowsByStatuses, mapApiLoanToRow } from '../utils/loan-ranking.mapper';

/** Simulates server-side sort, filter, and pagination on example data. */
export function queryLoansExampleData(query: LoanTableQuery): LoanTableResult {
  let rows = LOANS_RANKING_EXAMPLE_DATA.map((record, index) => mapApiLoanToRow(record, index));

  rows = filterRowsByStatuses(rows, query.statuses);

  const description = query.description?.trim().toLowerCase();
  if (description) {
    rows = rows.filter((row) => matchesDescription(row, description));
  }

  if (query.columnFilters?.length) {
    for (const filter of query.columnFilters) {
      const value = String(filter.value ?? '')
        .trim()
        .toLowerCase();
      if (!value || value === 'all') {
        continue;
      }
      rows = rows.filter((row) => matchesColumnFilter(row, filter.id, value));
    }
  }

  if (query.sorting?.length) {
    const { id, desc } = query.sorting[0];
    rows = [...rows].sort((a, b) => compareRows(a, b, id, desc));
  }

  const totalCount = rows.length;
  const start = (query.page - 1) * query.pageSize;
  const pagedRows = rows.slice(start, start + query.pageSize);

  return { rows: pagedRows, totalCount };
}

function matchesDescription(row: LoanRankingRow, keyword: string): boolean {
  return (
    row.loanId.toLowerCase().includes(keyword) ||
    row.loanKey.toLowerCase().includes(keyword) ||
    row.loanDescription.toLowerCase().includes(keyword) ||
    row.investorName.toLowerCase().includes(keyword) ||
    row.loanAlias.toLowerCase().includes(keyword)
  );
}

function matchesColumnFilter(row: LoanRankingRow, columnId: string, value: string): boolean {
  switch (columnId) {
    case 'loanId':
      return row.loanId.toLowerCase().includes(value);
    case 'loanDescription':
      return row.loanDescription.toLowerCase().includes(value);
    case 'loanAlias':
      return row.loanAlias.toLowerCase().includes(value);
    case 'investorName':
      return row.investorName.toLowerCase().includes(value);
    case 'ranking':
      return String(row.ranking).includes(value);
    case 'dummyLoanIdentifier':
      return formatBool(row.dummyLoanIdentifier).toLowerCase() === value;
    case 'lateInterestApplicable':
      return formatBool(row.lateInterestApplicable).toLowerCase() === value;
    case 'lateInterestOffNote':
      return row.lateInterestOffNote.toLowerCase().includes(value);
    case 'dateDwhUpdate':
      return row.dateDwhUpdate.toLowerCase().includes(value);
    default:
      return true;
  }
}

function compareRows(
  a: LoanRankingRow,
  b: LoanRankingRow,
  columnId: string,
  desc: boolean,
): number {
  const av = getSortValue(a, columnId);
  const bv = getSortValue(b, columnId);
  if (av < bv) {
    return desc ? 1 : -1;
  }
  if (av > bv) {
    return desc ? -1 : 1;
  }
  return 0;
}

function getSortValue(row: LoanRankingRow, columnId: string): string | number {
  switch (columnId) {
    case 'loanId':
      return row.loanId;
    case 'loanDescription':
      return row.loanDescription;
    case 'loanAlias':
      return row.loanAlias;
    case 'investorName':
      return row.investorName;
    case 'ranking':
      return row.ranking;
    case 'dummyLoanIdentifier':
      return row.dummyLoanIdentifier ? 1 : 0;
    case 'lateInterestApplicable':
      return row.lateInterestApplicable ? 1 : 0;
    case 'lateInterestOffNote':
      return row.lateInterestOffNote;
    case 'dateDwhUpdate':
      return row.dateDwhUpdate;
    default:
      return '';
  }
}

function formatBool(value: boolean): string {
  return value ? 'true' : 'false';
}

export function rowToApiRecord(row: LoanRankingRow): LoanApiRecord {
  return {
    LoanKey: row.loanKey,
    LoanCode: row.loanId,
    LoanDescription: row.loanDescription,
    LoanAliasName: row.loanAlias,
    LoanAliasOptions: row.loanAliasOptions.join(','),
    InvestorName: row.investorName,
    LoanRanking: row.ranking,
    DummyLoanIdentifier: row.dummyLoanIdentifier,
    LateInterestApplicable: row.lateInterestApplicable,
    LateInterestOffNote: row.lateInterestOffNote,
    Status: row.status,
    UserUpdatedDate: row.dateDwhUpdate,
    UserUpdatedBy: row.updatedBy,
  };
}
