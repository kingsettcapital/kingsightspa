import { ColumnDef } from '@tanstack/angular-table';

import { OtherCostRow } from '../../../core/interfaces/other-cost.interfaces';

export type ColumnFilterType = 'text';

export type ColumnFilterConfig = {
  type: ColumnFilterType;
  placeholder?: string;
};

export const OTHER_COST_COLUMN_FILTER_CONFIG: Record<string, ColumnFilterConfig> = {
  loanId: { type: 'text', placeholder: 'Search loan ID...' },
  loanDescription: { type: 'text', placeholder: 'Search description...' },
  loanAlias: { type: 'text', placeholder: 'Search alias...' },
  outstandingInvoices: { type: 'text', placeholder: 'Search amount...' },
  estRealizationCosts: { type: 'text', placeholder: 'Search amount...' },
  costToComplete: { type: 'text', placeholder: 'Search amount...' },
  dateDwhUpdate: { type: 'text', placeholder: 'Search date...' },
};

export const OTHER_COST_COLUMNS: ColumnDef<OtherCostRow>[] = [
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
    id: 'outstandingInvoices',
    accessorKey: 'outstandingInvoices',
    header: 'Outstanding Invoices',
    size: 170,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'estRealizationCosts',
    accessorKey: 'estRealizationCosts',
    header: 'Est Realization Costs',
    size: 170,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'costToComplete',
    accessorKey: 'costToComplete',
    header: 'Cost to Complete',
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
