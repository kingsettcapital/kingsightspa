import { LoanApiRecord } from './loan.interfaces';

export type LoanRankingRow = {
  loanKey: string;
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  loanAliasOptions: string[];
  investorName: string;
  ranking: number;
  dummyLoanIdentifier: boolean;
  lateInterestApplicable: boolean;
  lateInterestOffNote: string;
  status: string;
  dateDwhUpdate: string;
  updatedBy: string;
  isNew?: boolean;
};

export type LoanTableSort = {
  id: string;
  desc: boolean;
};

export type LoanTableColumnFilter = {
  id: string;
  value: unknown;
};

export type LoanTableQuery = {
  page: number;
  pageSize: number;
  description?: string;
  loanAlias?: string;
  statuses?: string[];
  sorting?: LoanTableSort[];
  columnFilters?: LoanTableColumnFilter[];
};

export type LoanTableResult = {
  rows: LoanRankingRow[];
  totalCount: number;
  totalPages?: number;
};

export type LoanUpdatePayload = {
  LoanAliasName?: string;
  LoanRanking?: number | null;
  LateInterestOffNote?: string;
  UserUpdatedDate?: string;
  UserUpdatedBy?: string;
};

export type LoanRankingRowSnapshot = {
  loanAlias: string;
  ranking: number;
  lateInterestOffNote: string;
};

export type { LoanApiRecord };
