import {
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../investors/investor-detail/models/investor-detail-table.models';

export const TRANSACTION_PERIOD_TABLE_COLUMN: InvestorDetailTableColumn = {
  key: 'period',
  label: 'Period',
  type: 'text',
  align: 'left',
  sortBy: 'period',
  tone: 'muted',
};

export function transactionTableRowsIncludePeriod(rows: InvestorDetailTableRow[]): boolean {
  return rows.some((row) => {
    const period = row['period'];
    return typeof period === 'string' && period.trim().length > 0;
  });
}

export function withOptionalPeriodColumn(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  insertAfterKey: string,
): InvestorDetailTableColumn[] {
  if (!transactionTableRowsIncludePeriod(rows)) {
    return columns.filter((column) => column.key !== 'period');
  }

  if (columns.some((column) => column.key === 'period')) {
    return columns;
  }

  const insertIndex = columns.findIndex((column) => column.key === insertAfterKey);
  const index = insertIndex >= 0 ? insertIndex + 1 : columns.length;
  return [
    ...columns.slice(0, index),
    TRANSACTION_PERIOD_TABLE_COLUMN,
    ...columns.slice(index),
  ];
}

export type TransactionTableSortDir = 'asc' | 'desc';

export interface TransactionTableSort {
  sortBy: string;
  sortDir: TransactionTableSortDir;
}

export const TRANSACTION_TABLE_DEFAULT_SORT: TransactionTableSort = {
  sortBy: 'period',
  sortDir: 'asc',
};

const SERVER_SORTED_TRANSACTION_TABLE_IDS = new Set([
  'capital-activities',
  'distributions',
  'irrs',
  'capital-obligations',
  'net-assets',
]);

export function isServerSortedTransactionTable(blockId: string): boolean {
  return SERVER_SORTED_TRANSACTION_TABLE_IDS.has(blockId);
}

export function resolveTransactionTableSort(
  blockId: string,
  sortState: Record<string, TransactionTableSort>,
): TransactionTableSort | null {
  const resolved = sortState[blockId];
  if (resolved) {
    return resolved;
  }
  return isServerSortedTransactionTable(blockId) ? TRANSACTION_TABLE_DEFAULT_SORT : null;
}
