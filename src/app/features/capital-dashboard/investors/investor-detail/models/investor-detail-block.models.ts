import {
  InvestorDetailTableColumn,
  InvestorDetailTableConfig,
  InvestorDetailTableRow,
} from './investor-detail-table.models';

import { InvestorDetailTransactionHubBlock } from './investor-transaction-hub.models';

export type InvestorDetailTableVariant =
  | 'default'
  | 'transactions'
  | 'communications'
  | 'investments'
  | 'asset-transactions'
  | 'fund-holdings'
  | 'underlying-investments';

export interface InvestorDetailTablePagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface InvestorDetailTableDateFilters {
  sinceStart: string;
  sinceEnd: string;
}

export interface InvestorDetailTableBlock extends InvestorDetailTableConfig {
  kind: 'table';
  subtitle?: string;
  subtitleAccent?: string;
  variant?: InvestorDetailTableVariant;
  showToolbar?: boolean;
  pagination?: InvestorDetailTablePagination;
  dateFilters?: InvestorDetailTableDateFilters;
}

export interface InvestorDetailFieldItem {
  label: string;
  value: string;
  tone?: 'default' | 'warning' | 'positive' | 'negative' | 'muted';
  multiline?: boolean;
}

export interface InvestorDetailFieldColumn {
  title?: string;
  fields: InvestorDetailFieldItem[];
}

export interface InvestorDetailOccupancyFooter {
  label: string;
  percent: number;
  committedLabel: string;
  vacantLabel: string;
}

export interface InvestorDetailDeploymentBar {
  label: string;
  percent: number;
  leftLabel: string;
  rightLabel: string;
}

export interface InvestorDetailFundMembershipItem {
  fundKey: number;
  name: string;
}

export interface InvestorDetailFundMembership {
  count: number;
  items: InvestorDetailFundMembershipItem[];
  moreCount: number;
}

export interface InvestorDetailOverviewMiniKpi {
  label: string;
  value: string;
}

export type InvestorOverviewHighlightTone = 'default' | 'accent' | 'info' | 'positive' | 'muted';

export interface InvestorOverviewHighlightMetric {
  label: string;
  value: string;
  subtext?: string;
  valueTone?: InvestorOverviewHighlightTone;
  subtextTone?: InvestorOverviewHighlightTone;
  inlineHint?: string;
  inlineHintTone?: 'positive' | 'muted';
  /** 1-based column placement for sparse bottom rows (Deal Highlights layout). */
  gridColumn?: 1 | 2 | 3 | 4;
  multiline?: boolean;
}

export interface InvestorOverviewHighlights {
  topRow: InvestorOverviewHighlightMetric[];
  bottomRow: InvestorOverviewHighlightMetric[];
}

export interface InvestorDetailEntityOverviewBlock {
  kind: 'entity-overview';
  id: string;
  title: string;
  variant: 'investor' | 'fund';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  columns: InvestorDetailFieldColumn[];
  highlights?: InvestorOverviewHighlights;
  fundMembership?: InvestorDetailFundMembership;
  performanceMiniKpis?: InvestorDetailOverviewMiniKpi[];
  deploymentBar?: InvestorDetailDeploymentBar;
  deploymentBarPlacement?: 'full' | 'performance-column';
}

export interface InvestorDetailFieldGridBlock {
  kind: 'field-grid';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  layout?: 'columns' | 'paired-rows';
  columns: InvestorDetailFieldColumn[];
  occupancyFooter?: InvestorDetailOccupancyFooter;
}

export interface InvestorDetailLeasingMetric {
  label: string;
  value: string;
  hint?: string;
}

export interface InvestorDetailLeasingSummaryBlock {
  kind: 'leasing-summary';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  metricGroups: InvestorDetailLeasingMetric[][];
  leaseExpirySchedule: InvestorDetailDebtMaturityBar[];
}

export interface InvestorDetailKpiCard {
  label: string;
  value: string;
  hint?: string;
  variant?: 'navy' | 'blue' | 'blue-light' | 'gold' | 'slate';
}

export interface InvestorDetailKpiRowBlock {
  kind: 'kpi-row';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  display?: 'colored' | 'performance';
  cards: InvestorDetailKpiCard[];
}

export interface InvestorDetailEsgMetricCard {
  label: string;
  value: string;
  hint: string;
}

export interface InvestorDetailEsgMetricsBlock {
  kind: 'esg-metrics';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  cards: InvestorDetailEsgMetricCard[];
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

export interface InvestorDetailDebtMaturityBar {
  label: string;
  percent: number;
}

export interface InvestorDetailDebtFinancingBlock {
  kind: 'debt-financing';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  metrics: InvestorDetailFieldItem[];
  maturitySchedule: InvestorDetailDebtMaturityBar[];
}

export interface InvestorDetailRiskFlag {
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'warning';
}

export interface InvestorDetailRiskInsuranceBlock {
  kind: 'risk-insurance';
  id: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  coverageTitle: string;
  coverage: InvestorDetailFieldItem[];
  riskTitle: string;
  banner?: { message: string; tone: 'positive' | 'warning' };
  riskFlags: InvestorDetailRiskFlag[];
}

export type InvestorDetailBlock =
  | InvestorDetailTableBlock
  | InvestorDetailFieldGridBlock
  | InvestorDetailEntityOverviewBlock
  | InvestorDetailKpiRowBlock
  | InvestorDetailEsgMetricsBlock
  | InvestorDetailDocumentListBlock
  | InvestorDetailDebtFinancingBlock
  | InvestorDetailLeasingSummaryBlock
  | InvestorDetailRiskInsuranceBlock
  | InvestorDetailTransactionHubBlock;

export interface InvestorDetailSectionBlock {
  sectionId: string;
  blocks: InvestorDetailBlock[];
}

export type { InvestorDetailTableColumn, InvestorDetailTableRow };
