import { FundsDetailState } from '../../../store/capital-dashboard.state';
import { InvestorDetailTableBlock } from '../../../investors/investor-detail/models/investor-detail-block.models';
import { InvestorDetailTableRow } from '../../../investors/investor-detail/models/investor-detail-table.models';
import {
  InvestorDetailTransactionHubBlock,
  InvestorTransactionCategory,
  InvestorTransactionCategoryId,
  InvestorTransactionHubFilters,
} from '../../../investors/investor-detail/models/investor-transaction-hub.models';
import {
  buildCapitalActivitiesTable,
  buildDistributionsTable,
  buildIrrsTable,
  buildTableTotalsRow,
} from './investment-detail-tables.util';

function buildCategoryTable(
  categoryId: InvestorTransactionCategoryId,
  state: FundsDetailState,
  periodLabel: string,
): InvestorDetailTableBlock {
  switch (categoryId) {
    case 'capital-activities':
      return buildCapitalActivitiesTable(state.capitalActivities, periodLabel);
    case 'distributions':
      return buildDistributionsTable(state.distributionTable, periodLabel);
    case 'irrs':
      return buildIrrsTable(state.irr, periodLabel);
    default:
      return buildCapitalActivitiesTable(state.capitalActivities, periodLabel);
  }
}

function categoryLoading(categoryId: InvestorTransactionCategoryId, state: FundsDetailState): boolean {
  switch (categoryId) {
    case 'capital-activities':
      return state.capitalActivitiesLoading;
    case 'distributions':
      return state.distributionTableLoading;
    case 'irrs':
      return state.irrLoading;
    default:
      return false;
  }
}

function categoryHasNextPage(categoryId: InvestorTransactionCategoryId, state: FundsDetailState): boolean {
  switch (categoryId) {
    case 'capital-activities':
      return state.capitalActivitiesHasNextPage;
    case 'distributions':
      return state.distributionTableHasNextPage;
    case 'irrs':
      return state.irrHasNextPage;
    default:
      return false;
  }
}

function applyInvestorFilter(rows: InvestorDetailTableRow[], investorCode: string): InvestorDetailTableRow[] {
  if (investorCode === 'all') {
    return rows;
  }
  return rows.filter((row) => String(row['investorCode'] ?? '') === investorCode);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value && value !== '—'))].sort((a, b) => a.localeCompare(b));
}

export function buildFundTransactionCategories(state: FundsDetailState): InvestorTransactionCategory[] {
  return [
    { id: 'capital-activities', label: 'Capital Activities', count: state.capitalActivities.length },
    { id: 'distributions', label: 'Distributions', count: state.distributionTable.length },
    { id: 'irrs', label: 'IRRs', count: state.irr.length },
  ];
}

export function buildFundTransactionHubBlock(
  state: FundsDetailState,
  categoryId: InvestorTransactionCategoryId,
  periodSummary: string,
  _uiPage: number,
  filters: InvestorTransactionHubFilters,
): InvestorDetailTransactionHubBlock {
  const table = buildCategoryTable(categoryId, state, periodSummary);
  const sourceRows = table.rows;
  const rows = applyInvestorFilter(sourceRows, filters.fundCode);
  const totals = buildTableTotalsRow(table.columns, rows, 'investorCode');

  return {
    kind: 'transaction-hub',
    id: 'fund-transactions',
    title: 'Fund Transactions',
    collapsible: true,
    defaultExpanded: true,
    activeCategoryId: categoryId,
    categories: buildFundTransactionCategories(state),
    columns: table.columns,
    subtitle: table.subtitle,
    subtitleAccent: table.subtitleAccent,
    variant: table.variant,
    rows,
    totals,
    loading: categoryLoading(categoryId, state),
    periodSummary,
    recordCount: rows.length,
    uiPage: 1,
    uiPageSize: rows.length || 1,
    uiPageCount: 1,
    hasNextApiPage: categoryHasNextPage(categoryId, state),
    fundCodeOptions: uniqueSorted(sourceRows.map((row) => String(row['investorCode'] ?? ''))),
  };
}

export function fundHubCategorySearchKey(categoryId: InvestorTransactionCategoryId, state: FundsDetailState): string {
  switch (categoryId) {
    case 'capital-activities':
      return state.capitalActivitiesSearch;
    case 'distributions':
      return state.distributionTableSearch;
    case 'irrs':
      return state.irrSearch;
    default:
      return '';
  }
}

export function fundHubSortBlockId(categoryId: InvestorTransactionCategoryId): string {
  switch (categoryId) {
    case 'capital-activities':
      return 'capital-activities';
    case 'distributions':
      return 'distributions';
    case 'irrs':
      return 'irrs';
    default:
      return 'capital-activities';
  }
}
