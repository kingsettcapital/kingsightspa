import { InvestorDetailTableVariant } from './investor-detail-block.models';
import { InvestorDetailTableColumn, InvestorDetailTableRow } from './investor-detail-table.models';

export type InvestorTransactionCategoryId = 'capital-activities' | 'distributions' | 'irrs';

export interface InvestorTransactionCategory {
  id: InvestorTransactionCategoryId;
  label: string;
  count: number;
}

export interface InvestorTransactionHubFilters {
  fundCode: string;
}

export type TransactionHubBlockId = 'investor-transactions' | 'fund-transactions';

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
  variant?: InvestorDetailTableVariant;
  rows: InvestorDetailTableRow[];
  totals: InvestorDetailTableRow | null;
  loading: boolean;
  periodSummary: string;
  recordCount: number;
  uiPage: number;
  uiPageSize: number;
  uiPageCount: number;
  hasNextApiPage: boolean;
  fundCodeOptions: string[];
}

export const INVESTOR_TRANSACTION_HUB_UI_PAGE_SIZE = 10;
