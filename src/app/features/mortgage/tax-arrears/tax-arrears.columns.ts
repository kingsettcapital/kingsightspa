import { ColumnDef } from '@tanstack/angular-table';

import { TaxArrearsRow } from '../../../core/interfaces/tax-arrears.interfaces';
import type { DataTableColumnFilterConfig } from '../../../shared/components/data-table';

export const TAX_ARREARS_COLUMN_FILTER_CONFIG: Record<string, DataTableColumnFilterConfig> = {
  loanId: { type: 'text', placeholder: 'Search loan ID...' },
  loanDescription: { type: 'text', placeholder: 'Search description...' },
  loanAlias: { type: 'text', placeholder: 'Search alias...' },
  taxMemoDate: { type: 'date' },
  taxArrears: { type: 'text', placeholder: 'Search amount...' },
  taxYear: { type: 'text', placeholder: 'Search year...' },
  notes: { type: 'text', placeholder: 'Search notes...' },
  dateDwhUpdate: { type: 'date' },
};

export const TAX_ARREARS_COLUMNS: ColumnDef<TaxArrearsRow>[] = [
  {
    id: 'loanId',
    accessorKey: 'loanId',
    header: 'Loan ID',
    size: 110,
    minSize: 100,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanDescription',
    accessorKey: 'loanDescription',
    header: 'Description',
    size: 220,
    minSize: 180,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'loanAlias',
    accessorKey: 'loanAlias',
    header: 'Loan Alias',
    size: 160,
    minSize: 140,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'taxMemoDate',
    accessorKey: 'taxMemoDate',
    header: 'Tax Memo Date',
    size: 150,
    minSize: 140,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'taxArrears',
    accessorKey: 'taxArrears',
    header: 'Tax Arrears',
    size: 150,
    minSize: 130,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'taxYear',
    accessorKey: 'taxYear',
    header: 'Tax Year',
    size: 120,
    minSize: 110,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'notes',
    accessorKey: 'notes',
    header: 'Notes',
    size: 200,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'dateDwhUpdate',
    accessorKey: 'dateDwhUpdate',
    header: 'Date of DWH Update',
    size: 160,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
];
