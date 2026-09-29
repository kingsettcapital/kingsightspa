import { ApiQueryParams } from './api.service';
import { LoansPagedApiResponse } from '../interfaces/loans-api.interfaces';
import { LoanApiRecord } from '../interfaces/loan.interfaces';
import {
  LoanRankingRow,
  LoanTableQuery,
  LoanTableResult,
} from '../interfaces/loan-table.interfaces';
import { mapApiLoanToRow } from '../utils/loan-ranking.mapper';

const SERVER_COLUMN_FILTERS = new Set(['loanAlias', 'loanDescription']);

/** Builds query string params for GET /api/Loans. */
export function buildLoansApiQueryParams(query: LoanTableQuery): ApiQueryParams {
  const params: ApiQueryParams = {
    page: query.page,
    pageSize: query.pageSize,
  };

  const description = query.description?.trim();
  if (description) {
    params['description'] = description;
  }

  const loanAlias = query.loanAlias?.trim();
  if (loanAlias) {
    params['loanAlias'] = loanAlias;
  }

  if (query.statuses?.length) {
    params['status'] = query.statuses.join(',');
  }

  return params;
}

/** Maps GET /api/Loans response into table rows + pagination metadata. */
export function mapLoansPagedResponse(response: LoansPagedApiResponse): LoanTableResult {
  const rawItems = response.items ?? response.Items ?? [];
  const rows = rawItems.map((record, index) => mapApiLoanToRow(normalizeApiRecord(record), index));

  return {
    rows,
    totalCount: response.totalCount ?? rows.length,
    totalPages: response.totalPages,
  };
}

/** Column filters / sort not supported by the API are applied on the current page. */
export function applyClientTableTransforms(
  rows: LoanRankingRow[],
  query: LoanTableQuery,
): LoanRankingRow[] {
  let result = [...rows];

  if (query.columnFilters?.length) {
    for (const filter of query.columnFilters) {
      if (SERVER_COLUMN_FILTERS.has(filter.id)) {
        continue;
      }

      const value = String(filter.value ?? '')
        .trim()
        .toLowerCase();
      if (!value || value === 'all') {
        continue;
      }

      result = result.filter((row) => matchesColumnFilter(row, filter.id, value));
    }
  }

  const sortState = query.sorting?.[0];
  if (sortState) {
    const direction = sortState.desc ? -1 : 1;
    result.sort((left, right) => {
      const leftValue = getSortValue(left, sortState.id);
      const rightValue = getSortValue(right, sortState.id);
      return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
    });
  }

  return result;
}

/** Merges toolbar search + server-backed column filters into LoanTableQuery fields. */
export function resolveServerFiltersFromQuery(query: LoanTableQuery): LoanTableQuery {
  const descriptionParts: string[] = [];
  if (query.description?.trim()) {
    descriptionParts.push(query.description.trim());
  }

  let loanAlias = query.loanAlias?.trim() ?? '';

  for (const filter of query.columnFilters ?? []) {
    const value = String(filter.value ?? '').trim();
    if (!value) {
      continue;
    }

    if (filter.id === 'loanDescription') {
      descriptionParts.push(value);
    }
    if (filter.id === 'loanAlias') {
      loanAlias = value;
    }
  }

  return {
    ...query,
    description: descriptionParts.length ? descriptionParts.join(' ') : undefined,
    loanAlias: loanAlias || undefined,
  };
}

function normalizeApiRecord(record: LoanApiRecord): LoanApiRecord {
  const loanKey = record['loanKey'] ?? record['LoanKey'];
  if (loanKey !== undefined && loanKey !== null) {
    return {
      ...record,
      loanKey: String(loanKey),
      LoanKey: String(loanKey),
    };
  }
  return record;
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

function getSortValue(row: LoanRankingRow, columnId: string): string {
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
      return String(row.ranking);
    case 'dummyLoanIdentifier':
      return row.dummyLoanIdentifier ? '1' : '0';
    case 'lateInterestApplicable':
      return row.lateInterestApplicable ? '1' : '0';
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
