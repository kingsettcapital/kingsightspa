import { InvestorTransactionTableFiltersDto, InvestorDetailDto, InvestorFundHoldingTabRow } from '../../../shared/models/api.models';
import { isUnitizedFundType } from '../../../shared/utils/investment-detail-tab.util';
import { InvestorsDetailState } from '../../../store/capital-dashboard.state';
import {
  InvestorDetailTablePagination,
  InvestorDetailTableBlock,
} from '../models/investor-detail-block.models';
import {
  InvestorDetailTransactionHubBlock,
  InvestorTransactionCategory,
  InvestorTransactionCategoryId,
  InvestorTransactionFilterOption,
} from '../models/investor-transaction-hub.models';
import {
  buildCapitalActivitiesTable,
  buildCapitalObligationsTable,
  buildDistributionsTable,
  buildIrrsTable,
  buildNetAssetsTable,
  buildTableTotalsRow,
} from './investor-detail-tables.util';

export function normalizeInvestorTransactionTableFilters(
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
  state: InvestorsDetailState,
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

function categoryLoading(categoryId: InvestorTransactionCategoryId, state: InvestorsDetailState): boolean {
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
  state: InvestorsDetailState,
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

function categoryTotalCount(categoryId: InvestorTransactionCategoryId, state: InvestorsDetailState): number {
  return categoryPagination(categoryId, state).totalCount;
}

function readDetailFundType(fund: {
  fund_type_name?: string | null;
  fundTypeName?: string | null;
  fund_type?: string | null;
  fundType?: string | null;
}): string {
  const candidates = [fund.fund_type_name, fund.fundTypeName, fund.fund_type, fund.fundType];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function investorHasUnitizedFund(
  detail: InvestorDetailDto | null,
  fundHoldings: InvestorFundHoldingTabRow[],
): boolean {
  for (const fund of detail?.funds ?? []) {
    if (isUnitizedFundType(readDetailFundType(fund))) {
      return true;
    }
  }

  return fundHoldings.some((holding) => isUnitizedFundType(holding.fundType));
}

export function buildInvestorTransactionCategories(
  state: InvestorsDetailState,
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

export function hubCategoryFundCode(
  categoryId: InvestorTransactionCategoryId,
  state: InvestorsDetailState,
): string {
  switch (categoryId) {
    case 'capital-activities':
      return state.capitalActivitiesFundCode;
    case 'distributions':
      return state.distributionTableFundCode;
    case 'irrs':
      return state.irrFundCode;
    case 'capital-obligations':
      return state.capitalObligationsFundCode;
    case 'net-assets':
      return state.netAssetsFundCode;
    default:
      return '';
  }
}

export function buildInvestorTransactionHubBlock(
  state: InvestorsDetailState,
  categoryId: InvestorTransactionCategoryId,
  periodSummary: string,
  fundCodeOptions: InvestorTransactionFilterOption[],
  showNetAssets = true,
): InvestorDetailTransactionHubBlock {
  const table = buildCategoryTable(categoryId, state, periodSummary);
  const rows = table.rows;
  const pagination = categoryPagination(categoryId, state);
  const totals = rows.length ? buildTableTotalsRow(table.columns, rows) : null;
  const categories = buildInvestorTransactionCategories(state, showNetAssets);
  const activeCategoryId = categories.some((category) => category.id === categoryId)
    ? categoryId
    : categories[0]?.id ?? 'capital-activities';

  return {
    kind: 'transaction-hub',
    id: 'investor-transactions',
    title: 'Investor Transactions',
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

export function hubCategorySearchKey(categoryId: InvestorTransactionCategoryId, state: InvestorsDetailState): string {
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

export function hubSortBlockId(categoryId: InvestorTransactionCategoryId): string {
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
