import {
  InvestorDetailTableColumn,
  InvestorDetailTableConfig,
  InvestorDetailTableRow,
} from './investor-detail-table.models';

export type InvestorDetailTableVariant = 'default' | 'transactions' | 'communications' | 'investments';

export interface InvestorDetailTableBlock extends InvestorDetailTableConfig {
  kind: 'table';
  subtitle?: string;
  subtitleAccent?: string;
  variant?: InvestorDetailTableVariant;
  showToolbar?: boolean;
}

export interface InvestorDetailFieldItem {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'positive' | 'negative' | 'muted';
}

export interface InvestorDetailFieldColumn {
  title?: string;
  fields: InvestorDetailFieldItem[];
}

export interface InvestorDetailFieldGridBlock {
  kind: 'field-grid';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  columns: InvestorDetailFieldColumn[];
}

export interface InvestorDetailKpiCard {
  label: string;
  value: string;
  variant: 'navy' | 'blue' | 'blue-light' | 'gold' | 'slate';
}

export interface InvestorDetailKpiRowBlock {
  kind: 'kpi-row';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  cards: InvestorDetailKpiCard[];
}

export interface InvestorDetailDocumentItem {
  name: string;
  category: string;
  date: string;
  size: string;
}

export interface InvestorDetailDocumentListBlock {
  kind: 'document-list';
  id: string;
  title: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  documents: InvestorDetailDocumentItem[];
}

export type InvestorDetailBlock =
  | InvestorDetailTableBlock
  | InvestorDetailFieldGridBlock
  | InvestorDetailKpiRowBlock
  | InvestorDetailDocumentListBlock;

export interface InvestorDetailSectionBlock {
  sectionId: string;
  blocks: InvestorDetailBlock[];
}

export type { InvestorDetailTableColumn, InvestorDetailTableRow };
