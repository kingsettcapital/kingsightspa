import { ColumnDef } from '@tanstack/angular-table';

export type DataTableColumnFilterType = 'text' | 'boolean' | 'date';

export type DataTableColumnFilterConfig = {
  type: DataTableColumnFilterType;
  placeholder?: string;
};

export type DataTableBooleanFilterOption = {
  value: string;
  label: string;
};

export type DataTableConfig<TData> = {
  columns: ColumnDef<TData>[];
  columnFilterConfig?: Record<string, DataTableColumnFilterConfig>;
  booleanFilterOptions?: readonly DataTableBooleanFilterOption[];
  manualSorting?: boolean;
  manualFiltering?: boolean;
  enableColumnResizing?: boolean;
  scrollBody?: boolean;
  showPagination?: boolean;
  defaultColumnMinSize?: number;
  defaultColumnSize?: number;
};

/** Column ids that render a minimal header (no sort/filter/resize). */
export const DATA_TABLE_ACTIONS_COLUMN_IDS = ['rowActions'] as const;

export function isDataTableActionsColumn(columnId: string): boolean {
  return (DATA_TABLE_ACTIONS_COLUMN_IDS as readonly string[]).includes(columnId);
}
