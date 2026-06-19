import { InvestorTransactionTableFiltersDto } from '../../../shared/models/api.models';
import { isUnitizedFundType } from '../../../shared/utils/investment-detail-tab.util';
import { FundsDetailState } from '../../../store/capital-dashboard.state';
import {
  InvestorDetailTablePagination,
  InvestorDetailTableBlock,
} from '../../../investors/investor-detail/models/investor-detail-block.models';
import {
  InvestorDetailTransactionHubBlock,
  InvestorTransactionCategory,
  InvestorTransactionCategoryId,
  InvestorTransactionFilterOption,
} from '../../../investors/investor-detail/models/investor-transaction-hub.models';
import {
  buildCapitalActivitiesTable,
  buildCapitalObligationsTable,
  buildDistributionsTable,
  buildIrrsTable,
  buildNetAssetsTable,
  buildTableTotalsRow,
} from './investment-detail-tables.util';

export function normalizeFundTransactionTableFilters(
  response: InvestorTransactionTableFiltersDto | null | undefined,
): InvestorTransactionFilterOption[] {
  return (response?.items ?? [])
    .map((item) => ({
      value: String(item?.value ?? '').trim(),
      label: String(item?.label ?? item?.value ?? '').trim(),
    }))
    .filter((item) => item.value);
}

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
    case 'capital-obligations':
      return buildCapitalObligationsTable(state.capitalObligations, periodLabel);
    case 'net-assets':
      return buildNetAssetsTable(state.netAssets, periodLabel);
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
    case 'capital-obligations':
      return state.capitalObligationsLoading;
    case 'net-assets':
      return state.netAssetsLoading;
    default:
      return false;
  }
}

function categoryPagination(
  categoryId: InvestorTransactionCategoryId,
  state: FundsDetailState,
): InvestorDetailTablePagination {
  switch (categoryId) {
    case 'capital-activities':
      return {
        page: state.capitalActivitiesPage,
        pageSize: state.capitalActivitiesPageSize,
        totalPages: state.capitalActivitiesTotalPages,
        totalCount: state.capitalActivitiesTotalCount,
        hasPreviousPage: state.capitalActivitiesHasPreviousPage,
        hasNextPage: state.capitalActivitiesHasNextPage,
      };
    case 'distributions':
      return {
        page: state.distributionTablePage,
        pageSize: state.distributionTablePageSize,
        totalPages: state.distributionTableTotalPages,
        totalCount: state.distributionTableTotalCount,
        hasPreviousPage: state.distributionTableHasPreviousPage,
        hasNextPage: state.distributionTableHasNextPage,
      };
    case 'irrs':
      return {
        page: state.irrPage,
        pageSize: state.irrPageSize,
        totalPages: state.irrTotalPages,
        totalCount: state.irrTotalCount,
        hasPreviousPage: state.irrHasPreviousPage,
        hasNextPage: state.irrHasNextPage,
      };
    case 'capital-obligations':
      return {
        page: state.capitalObligationsPage,
        pageSize: state.capitalObligationsPageSize,
        totalPages: state.capitalObligationsTotalPages,
        totalCount: state.capitalObligationsTotalCount,
        hasPreviousPage: state.capitalObligationsHasPreviousPage,
        hasNextPage: state.capitalObligationsHasNextPage,
      };
    case 'net-assets':
      return {
        page: state.netAssetsPage,
        pageSize: state.netAssetsPageSize,
        totalPages: state.netAssetsTotalPages,
        totalCount: state.netAssetsTotalCount,
        hasPreviousPage: state.netAssetsHasPreviousPage,
        hasNextPage: state.netAssetsHasNextPage,
      };
    default:
      return {
        page: 1,
        pageSize: 25,
        totalPages: 0,
        totalCount: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
  }
}

function categoryTotalCount(categoryId: InvestorTransactionCategoryId, state: FundsDetailState): number {
  return categoryPagination(categoryId, state).totalCount;
}

export function fundShowsNetAssetsHub(fundType: string): boolean {
  return isUnitizedFundType(fundType);
}

export function buildFundTransactionCategories(
  state: FundsDetailState,
  showNetAssets = true,
): InvestorTransactionCategory[] {
  const categories: InvestorTransactionCategory[] = [
    {
      id: 'capital-activities',
      label: 'Capital Activities',
      count: categoryTotalCount('capital-activities', state),
    },
    {
      id: 'distributions',
      label: 'Distributions',
      count: categoryTotalCount('distributions', state),
    },
    {
      id: 'irrs',
      label: 'Performance',
      count: categoryTotalCount('irrs', state),
    },
    {
      id: 'capital-obligations',
      label: 'Capital Obligations',
      count: categoryTotalCount('capital-obligations', state),
    },
  ];

  if (showNetAssets) {
    categories.push({
      id: 'net-assets',
      label: 'Net Asset Value',
      count: categoryTotalCount('net-assets', state),
    });
  }

  return categories;
}

export function fundHubCategoryInvestorName(
  categoryId: InvestorTransactionCategoryId,
  state: FundsDetailState,
): string {
  switch (categoryId) {
    case 'capital-activities':
      return state.capitalActivitiesInvestorName;
    case 'distributions':
      return state.distributionTableInvestorName;
    case 'irrs':
      return state.irrInvestorName;
    case 'capital-obligations':
      return state.capitalObligationsInvestorName;
    case 'net-assets':
      return state.netAssetsInvestorName;
    default:
      return '';
  }
}

export function buildFundTransactionHubBlock(
  state: FundsDetailState,
  categoryId: InvestorTransactionCategoryId,
  periodSummary: string,
  fundCodeOptions: InvestorTransactionFilterOption[],
  showNetAssets = true,
): InvestorDetailTransactionHubBlock {
  const table = buildCategoryTable(categoryId, state, periodSummary);
  const rows = table.rows;
  const pagination = categoryPagination(categoryId, state);
  const totals = rows.length ? buildTableTotalsRow(table.columns, rows, 'investorName') : null;
  const categories = buildFundTransactionCategories(state, showNetAssets);
  const activeCategoryId = categories.some((category) => category.id === categoryId)
    ? categoryId
    : categories[0]?.id ?? 'capital-activities';

  return {
    kind: 'transaction-hub',
    id: 'fund-transactions',
    title: 'Fund Transactions',
    collapsible: true,
    defaultExpanded: true,
    activeCategoryId,
    categories,
    columns: table.columns,
    subtitle: table.subtitle,
    subtitleAccent: table.subtitleAccent,
    variant: table.variant,
    rows,
    totals,
    loading: categoryLoading(categoryId, state),
    periodSummary,
    recordCount: pagination.totalCount,
    pagination,
    fundCodeOptions,
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
    case 'capital-obligations':
      return state.capitalObligationsSearch;
    case 'net-assets':
      return state.netAssetsSearch;
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
    case 'capital-obligations':
      return 'capital-obligations';
    case 'net-assets':
      return 'net-assets';
    default:
      return 'capital-activities';
  }
}
