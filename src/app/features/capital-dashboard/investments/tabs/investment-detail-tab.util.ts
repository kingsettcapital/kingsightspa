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

export function sumInvestmentDetailTabRows(rows: InvestmentDetailTabRow[]): {
  totalAmount: number;
  totalUnits: number;
} {
  return rows.reduce(
    (acc, row) => ({
      totalAmount: acc.totalAmount + row.amount,
      totalUnits: acc.totalUnits + parseTabUnits(row.units),
    }),
    { totalAmount: 0, totalUnits: 0 },
  );
}

export function filterInvestmentDetailTabRows(
  rows: InvestmentDetailTabRow[],
  searchQuery: string,
): InvestmentDetailTabRow[] {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => investmentDetailTabRowSearchText(row).toLowerCase().includes(q));
}

export function investmentDetailTabRowSearchText(row: InvestmentDetailTabRow): string {
  const periodOrDate = row.date ?? row.period ?? '';
  return `${periodOrDate} ${row.amount} ${row.units} ${row.description}`;
}

export function investmentDetailTableColumns(isDaily: boolean, fundType: string): string[] {
  const cols: string[] = isDaily ? ['date'] : ['period'];
  cols.push(fundType === 'Unitized' ? 'units' : 'amount');
  cols.push('description');
  return cols;
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
