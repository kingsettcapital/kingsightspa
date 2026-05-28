import { ColumnDef } from '@tanstack/angular-table';

import {
  DEFAULT_STATUS_OPTIONS,
  EXIT_PLAN_OPTIONS,
} from '../../../core/constants/default-subjective-analytics-options';
import { DefaultSubjectiveAnalyticsRow } from '../../../core/interfaces/default-subjective-analytics.interfaces';
import type { DataTableColumnFilterConfig } from '../../../shared/components/data-table';

export { DEFAULT_STATUS_OPTIONS, EXIT_PLAN_OPTIONS };

export const DEFAULT_SUBJECTIVE_ANALYTICS_COLUMN_FILTER_CONFIG: Record<
  string,
  DataTableColumnFilterConfig
> = {
  loanId: { type: 'text', placeholder: 'Search loan ID...' },
  loanDescription: { type: 'text', placeholder: 'Search description...' },
  loanAlias: { type: 'text', placeholder: 'Search alias...' },
  maturityDate: { type: 'date' },
  defaultStatus: { type: 'text', placeholder: 'Search status...' },
  exitPlan: { type: 'text', placeholder: 'Search exit plan...' },
  exitDate: { type: 'date' },
  maturityAdditionalDetail: { type: 'text', placeholder: 'Search detail...' },
  dateDwhUpdate: { type: 'date' },
};

export const DEFAULT_SUBJECTIVE_ANALYTICS_COLUMNS: ColumnDef<DefaultSubjectiveAnalyticsRow>[] = [
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
    id: 'maturityDate',
    accessorKey: 'maturityDate',
    header: 'Maturity Date',
    size: 140,
    minSize: 130,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'defaultStatus',
    accessorKey: 'defaultStatus',
    header: 'Default Status',
    size: 170,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'exitPlan',
    accessorKey: 'exitPlan',
    header: 'Exit Plan',
    size: 170,
    minSize: 150,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'exitDate',
    accessorKey: 'exitDate',
    header: 'Exit Date',
    size: 150,
    minSize: 140,
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    id: 'maturityAdditionalDetail',
    accessorKey: 'maturityAdditionalDetail',
    header: 'Maturity - Additional Detail',
    size: 220,
    minSize: 180,
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
