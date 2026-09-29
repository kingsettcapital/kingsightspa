export type MortgageGridLoadMessageOptions = {
  isLoading: boolean;
  totalRows: number;
  visibleRows: number;
  hasClientFilter: boolean;
  /** Singular noun, e.g. "loan", "record", "row". */
  entitySingular?: string;
  emptyMessage?: string;
};

/** Banner text for loaded vs client-filtered grid row counts. */
export function buildMortgageGridLoadMessage(options: MortgageGridLoadMessageOptions): string {
  if (options.isLoading) {
    return '';
  }

  const entity = options.entitySingular ?? 'loan';
  const label = `${entity}(s)`;

  if (options.totalRows === 0) {
    return options.emptyMessage ?? `No ${label} returned for the selected filters.`;
  }

  if (options.hasClientFilter && options.visibleRows !== options.totalRows) {
    return `${options.visibleRows} ${label} shown (${options.totalRows} loaded).`;
  }

  return `${options.visibleRows} ${label} loaded.`;
}
