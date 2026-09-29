export type InvestorDetailColumnType =
  | 'text'
  | 'number'
  | 'amount'
  | 'date'
  | 'link'
  | 'status'
  | 'percent'
  | 'transaction-type'
  | 'transaction-fund'
  | 'transaction-investor'
  | 'amount-fund';

export type InvestorDetailColumnTone =
  | 'default'
  | 'warning'
  | 'positive'
  | 'negative'
  | 'muted'
  | 'info';

export const INVESTOR_DETAIL_CELL_TONES_KEY = '__cellTones';

export interface InvestorDetailTableColumn {
  key: string;
  label: string;
  type: InvestorDetailColumnType;
  align?: 'left' | 'right' | 'center';
  tone?: InvestorDetailColumnTone;
  /** API `sortBy` query param for server-side column sorting. */
  sortBy?: string;
}

export type InvestorDetailTableCellValue = string | number | null | undefined;

export interface InvestorDetailTableRow {
  [key: string]: InvestorDetailTableCellValue | Record<string, InvestorDetailColumnTone> | undefined;
}

export interface InvestorDetailTableConfig {
  id: string;
  title: string;
  columns: InvestorDetailTableColumn[];
  rows: InvestorDetailTableRow[];
  totals?: InvestorDetailTableRow | null;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface InvestorDetailSidebarItem {
  id: string;
  label: string;
}

export interface InvestorDetailSidebarSection {
  title: string;
  items: InvestorDetailSidebarItem[];
}

