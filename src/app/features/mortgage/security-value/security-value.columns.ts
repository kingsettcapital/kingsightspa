import { ColumnDef } from '@tanstack/angular-table';

import { SecurityValueRow } from '../../../core/interfaces/security-value.interfaces';

export type ColumnFilterType = 'text';

export type ColumnFilterConfig = {
  type: ColumnFilterType;
  placeholder?: string;
};

export const SECURITY_VALUE_COLUMN_FILTER_CONFIG: Record<string, ColumnFilterConfig> = {
  loanAlias: { type: 'text', placeholder: 'Search loan alias...' },
  collateralPerYardi: { type: 'text', placeholder: 'Search collateral...' },
  securityValue: { type: 'text', placeholder: 'Search security value...' },
  dateDwhUpdate: { type: 'text', placeholder: 'Search date...' },
};

export const SECURITY_VALUE_COLUMNS: ColumnDef<SecurityValueRow>[] = [
  {
    id: 'loanAlias',
    accessorKey: 'loanAlias',
    header: 'Loan Alias',
    size: 280,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'collateralPerYardi',
    accessorKey: 'collateralPerYardi',
    header: 'Collateral Per Yardi',
    size: 200,
    minSize: 170,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'securityValue',
    accessorKey: 'securityValue',
    header: 'Security Value',
    size: 200,
    minSize: 170,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'dateDwhUpdate',
    accessorKey: 'dateDwhUpdate',
    header: 'Date of DWH Update',
    size: 180,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
];
