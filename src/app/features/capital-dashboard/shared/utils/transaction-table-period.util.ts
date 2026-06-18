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
