import { ColumnDef } from '@tanstack/angular-table';

import { InvestorAliasRow } from '../../../core/interfaces/investor.interfaces';
import type { DataTableColumnFilterConfig } from '../../../shared/components/data-table';

export const INVESTOR_ALIAS_COLUMN_FILTER_CONFIG: Record<string, DataTableColumnFilterConfig> = {
  investorCode: { type: 'text', placeholder: 'Search investor code...' },
  investor: { type: 'text', placeholder: 'Search investor...' },
  investorAlias: { type: 'text', placeholder: 'Search alias...' },
  dateDwhUpdate: { type: 'text', placeholder: 'Search date...' },
};

export const INVESTOR_ALIAS_COLUMNS: ColumnDef<InvestorAliasRow>[] = [
  {
    id: 'investorCode',
    accessorKey: 'investor_code',
    header: 'Investor Code',
    size: 140,
    minSize: 120,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'investor',
    accessorKey: 'investor_name',
    header: 'Investor',
    size: 280,
    minSize: 200,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'investorAlias',
    accessorKey: 'investor_alias_name',
    header: 'Investor Alias',
    size: 200,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'dateDwhUpdate',
    accessorKey: 'user_updated_date',
    header: 'Date of DWH Update',
    size: 170,
    minSize: 160,
    enableSorting: true,
    enableColumnFilter: true,
  },
];
