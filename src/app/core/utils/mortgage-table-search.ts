export const MORTGAGE_SEARCH_PLACEHOLDER = 'Enter Search Value';

export function filterRowsByTableSearch<TRow, TKey extends string>(
  rows: TRow[],
  keyword: string,
  columns: readonly { key: TKey }[],
  getCellDisplayValue: (row: TRow, key: TKey) => string,
): TRow[] {
  const term = keyword.trim().toLowerCase();
  if (!term) {
    return rows;
  }

  return rows.filter((row) =>
    columns.some((column) =>
      getCellDisplayValue(row, column.key).toLowerCase().includes(term),
    ),
  );
}
