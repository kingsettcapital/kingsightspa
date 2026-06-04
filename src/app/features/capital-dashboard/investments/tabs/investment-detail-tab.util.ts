export type InvestmentDetailTabTimeframe = 'ltd' | 'quarterly' | 'daily';

export type InvestmentDetailTabRow = {
  period?: string;
  date?: string;
  amount: number;
  units: string;
  description: string;
};

export function parseTabUnits(units: string): number {
  const parsed = Number(String(units).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isNegativeTabUnits(units: string): boolean {
  return parseTabUnits(units) < 0;
}

export function sumInvestmentDetailTabRows(rows: InvestmentDetailTabRow[] | null | undefined): {
  totalAmount: number;
  totalUnits: number;
} {
  return coerceTabTableRows(rows).reduce(
    (acc, row) => ({
      totalAmount: acc.totalAmount + row.amount,
      totalUnits: acc.totalUnits + parseTabUnits(row.units),
    }),
    { totalAmount: 0, totalUnits: 0 },
  );
}

export function coerceTabTableRows<T>(rows: T[] | null | undefined): T[] {
  return Array.isArray(rows) ? rows : [];
}

export function filterInvestmentDetailTabRows(
  rows: InvestmentDetailTabRow[] | null | undefined,
  searchQuery: string,
): InvestmentDetailTabRow[] {
  const source = coerceTabTableRows(rows);
  const q = searchQuery.trim().toLowerCase();
  if (!q) return source;
  return source.filter((row) => investmentDetailTabRowSearchText(row).toLowerCase().includes(q));
}

export function investmentDetailTabRowSearchText(row: InvestmentDetailTabRow): string {
  const periodOrDate = row.date ?? row.period ?? '';
  const fundCode = 'fundCode' in row ? String((row as { fundCode?: string }).fundCode ?? '') : '';
  return `${fundCode} ${periodOrDate} ${row.amount} ${row.units} ${row.description}`;
}

export function investmentAmountTableColumns(isDaily: boolean): string[] {
  return isDaily ? ['date', 'amount', 'description'] : ['period', 'amount', 'description'];
}

export function investmentCommitmentTableColumns(isDaily: boolean): string[] {
  return isDaily
    ? ['fundCode', 'date', 'amount', 'description']
    : ['fundCode', 'period', 'amount', 'description'];
}

export function investmentFundInvestmentsTableColumns(isDaily: boolean): string[] {
  return isDaily
    ? ['fundCode', 'date', 'amount', 'description']
    : ['fundCode', 'period', 'amount', 'description'];
}

export function isUnitizedFundType(fundType: string): boolean {
  return fundType.trim().toLowerCase() === 'unitized';
}

export function investmentDetailTableColumns(isDaily: boolean, fundType: string): string[] {
  const cols: string[] = isDaily ? ['date'] : ['period'];
  cols.push('amount');
  if (isUnitizedFundType(fundType)) {
    cols.push('units');
  }
  cols.push('description');
  return cols;
}

export type InvestmentAmountTabRow = Omit<InvestmentDetailTabRow, 'units'> & {
  fundCode?: string;
};

export function filterInvestmentAmountTabRows(
  rows: InvestmentAmountTabRow[] | null | undefined,
  searchQuery: string,
): InvestmentAmountTabRow[] {
  const source = coerceTabTableRows(rows);
  const q = searchQuery.trim().toLowerCase();
  if (!q) return source;
  return source.filter((row) => {
    const periodOrDate = row.date ?? row.period ?? '';
    const text = `${row.fundCode ?? ''} ${periodOrDate} ${row.amount} ${row.description}`;
    return text.toLowerCase().includes(q);
  });
}

export function sumInvestmentAmountTabRows(
  rows: InvestmentAmountTabRow[] | null | undefined,
): { totalAmount: number } {
  return coerceTabTableRows(rows).reduce(
    (acc, row) => ({ totalAmount: acc.totalAmount + row.amount }),
    { totalAmount: 0 },
  );
}

export function rowsForInvestmentDetailTimeframe(
  timeframe: InvestmentDetailTabTimeframe,
  sources: {
    ltd: InvestmentDetailTabRow[];
    quarterly: InvestmentDetailTabRow[];
    daily: InvestmentDetailTabRow[];
  },
): InvestmentDetailTabRow[] {
  if (timeframe === 'daily') return sources.daily;
  if (timeframe === 'quarterly') return sources.quarterly;
  return sources.ltd;
}
