import { InvestorDetailTablePagination } from './investor-detail-block.models';
import { InvestorDetailTableColumn, InvestorDetailTableRow } from './investor-detail-table.models';

export type InvestorTransactionCategoryId =
  | 'capital-activities'
  | 'distributions'
  | 'irrs'
  | 'capital-obligations'
  | 'net-assets';

export interface InvestorTransactionCategory {
  id: InvestorTransactionCategoryId;
  label: string;
  count: number;
}

export interface InvestorTransactionHubFilters {
  fundCode: string;
}

export type TransactionHubBlockId = 'investor-transactions' | 'fund-transactions';

export interface InvestorTransactionFilterOption {
  value: string;
  label: string;
}

export interface InvestorDetailTransactionHubBlock {
  kind: 'transaction-hub';
  id: TransactionHubBlockId;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  activeCategoryId: InvestorTransactionCategoryId;
  categories: InvestorTransactionCategory[];
  columns: InvestorDetailTableColumn[];
  subtitle?: string;
  subtitleAccent?: string;
  variant?: import('./investor-detail-block.models').InvestorDetailTableVariant;
  rows: InvestorDetailTableRow[];
  totals: InvestorDetailTableRow | null;
  loading: boolean;
  periodSummary: string;
  recordCount: number;
  pagination: InvestorDetailTablePagination;
  fundCodeOptions: InvestorTransactionFilterOption[];
}
