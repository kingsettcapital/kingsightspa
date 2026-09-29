import { ColumnDef } from '@tanstack/angular-table';

import { LoanRankingRow } from '../../../core/interfaces/loan-table.interfaces';

/** Column ids sent as GET /api/Loans query params (server-side). */
export const LOAN_RANKING_SERVER_FILTER_COLUMNS = {
  loanDescription: 'description',
  loanAlias: 'loanAlias',
} as const;

export type ColumnFilterType = 'text' | 'boolean';

export type ColumnFilterConfig = {
  type: ColumnFilterType;
  placeholder?: string;
};

export const COLUMN_FILTER_CONFIG: Record<string, ColumnFilterConfig> = {
  loanId: { type: 'text', placeholder: 'Search loan ID...' },
  loanDescription: { type: 'text', placeholder: 'Search description...' },
  loanAlias: { type: 'text', placeholder: 'Search alias...' },
  investorName: { type: 'text', placeholder: 'Search investor...' },
  ranking: { type: 'text', placeholder: 'Search ranking...' },
  dummyLoanIdentifier: { type: 'boolean' },
  lateInterestApplicable: { type: 'boolean' },
  lateInterestOffNote: { type: 'text', placeholder: 'Search note...' },
  dateDwhUpdate: { type: 'text', placeholder: 'Search date...' },
};

export const BOOLEAN_FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'TRUE' },
  { value: 'false', label: 'FALSE' },
] as const;

export const LOAN_RANKING_ROW_ACTIONS_COLUMN: ColumnDef<LoanRankingRow> = {
  id: 'rowActions',
  header: '',
  size: 52,
  minSize: 52,
  enableSorting: false,
  enableColumnFilter: false,
  enableResizing: false,
};

export const LOAN_RANKING_COLUMNS: ColumnDef<LoanRankingRow>[] = [
  {
    id: 'loanId',
    accessorKey: 'loanId',
    header: 'Loan ID',
    size: 130,
    minSize: 120,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanDescription',
    accessorKey: 'loanDescription',
    header: 'Description',
    size: 340,
    minSize: 260,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanAlias',
    accessorKey: 'loanAlias',
    header: 'Loan Alias',
    size: 200,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'investorName',
    accessorKey: 'investorName',
    header: 'Investor',
    size: 220,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'ranking',
    accessorKey: 'ranking',
    header: 'Ranking',
    size: 120,
    minSize: 110,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'dummyLoanIdentifier',
    accessorKey: 'dummyLoanIdentifier',
    header: 'Dummy Loan Identifier',
    size: 220,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'lateInterestApplicable',
    accessorKey: 'lateInterestApplicable',
    header: 'Late Interest Applicable',
    size: 230,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'lateInterestOffNote',
    accessorKey: 'lateInterestOffNote',
    header: 'Late Interest Off Note',
    size: 240,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'dateDwhUpdate',
    accessorKey: 'dateDwhUpdate',
    header: 'Date of DWH Update',
    size: 170,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
];
