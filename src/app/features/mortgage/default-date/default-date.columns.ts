import { ColumnDef } from '@tanstack/angular-table';

import { DefaultDateRow } from '../../../core/interfaces/default-date.interfaces';
import type { DataTableColumnFilterConfig } from '../../../shared/components/data-table';

export const DEFAULT_DATE_COLUMN_FILTER_CONFIG: Record<string, DataTableColumnFilterConfig> = {
  loanId: { type: 'text', placeholder: 'Search loan ID...' },
  loanDescription: { type: 'text', placeholder: 'Search description...' },
  loanAlias: { type: 'text', placeholder: 'Search alias...' },
  loanTermDefaultDate: { type: 'date' },
  defaultDate: { type: 'date' },
  dateDwhUpdate: { type: 'date' },
};

export const DEFAULT_DATE_COLUMNS: ColumnDef<DefaultDateRow>[] = [
  {
    id: 'loanId',
    accessorKey: 'loanId',
    header: 'Loan ID',
    size: 120,
    minSize: 110,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanDescription',
    accessorKey: 'loanDescription',
    header: 'Description',
    size: 260,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanAlias',
    accessorKey: 'loanAlias',
    header: 'Loan Alias',
    size: 180,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanTermDefaultDate',
    accessorKey: 'loanTermDefaultDate',
    header: 'Loan Term Default Date',
    size: 190,
    minSize: 170,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'defaultDate',
    accessorKey: 'defaultDate',
    header: 'Default Date',
    size: 170,
    minSize: 150,
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
