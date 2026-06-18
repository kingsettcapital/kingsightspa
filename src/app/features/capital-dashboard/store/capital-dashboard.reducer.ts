import { createFeature, createReducer, on } from '@ngrx/store';

import {
  FundDetailCacheEntry,
  InvestorDetailCacheEntry,
  assetsListStateFromCacheEntry,
  fundsListStateFromCacheEntry,
  investorsListStateFromCacheEntry,
  listStateFromCacheEntry,
  readFundCommitmentsPageCache,
  readFundNavPageCache,
  readFundCapitalActivitiesPageCache,
  readFundDistributionTablePageCache,
  readFundIrrPageCache,
  readFundCapitalObligationsPageCache,
  readFundNetAssetsPageCache,
  readFundPeriodsCache,
  readFundDistributionsPageCache,
  readFundInvestmentsPageCache,
  readFundUnfundedCommitmentsPageCache,
  readInvestorCapitalInvestmentsPageCache,
  readInvestorCommitmentsPageCache,
  readInvestorDistributionsPageCache,
  readInvestorNavPageCache,
  readInvestorCapitalActivitiesPageCache,
  readInvestorDistributionTablePageCache,
  readInvestorIrrPageCache,
  readInvestorCapitalObligationsPageCache,
  readInvestorNetAssetsPageCache,
  readInvestorFundHoldingsCache,
  readInvestorPeriodsCache,
  readInvestorUnfundedCommitmentsPageCache,
  readAssetsListCacheEntry,
  readFundsListCacheEntry,
  readInvestorsListCacheEntry,
  readListCacheEntry,
  writeFundCommitmentsPageCache,
  writeFundDistributionsPageCache,
  writeFundInvestmentsPageCache,
  writeFundNavPageCache,
  writeFundCapitalActivitiesPageCache,
  writeFundDistributionTablePageCache,
  writeFundIrrPageCache,
  writeFundCapitalObligationsPageCache,
  writeFundNetAssetsPageCache,
  writeFundPeriodsCache,
  writeFundUnfundedCommitmentsPageCache,
  writeInvestorCapitalInvestmentsPageCache,
  writeInvestorCommitmentsPageCache,
  writeInvestorDistributionsPageCache,
  writeInvestorNavPageCache,
  writeInvestorCapitalActivitiesPageCache,
  writeInvestorDistributionTablePageCache,
  writeInvestorIrrPageCache,
  writeInvestorCapitalObligationsPageCache,
  writeInvestorNetAssetsPageCache,
  writeInvestorFundHoldingsCache,
  writeInvestorPeriodsCache,
  writeInvestorUnfundedCommitmentsPageCache,
  writeAssetsListCacheEntry,
  writeFundsListCacheEntry,
  writeInvestorsListCacheEntry,
  writeListCacheEntry,
  extractPagedItems,
} from './capital-dashboard-cache.util';
import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { extractAssetsListSummary } from '../shared/utils/asset-list-row.util';
import { extractFundsListSummary } from '../shared/utils/fund-list-row.util';
import { extractInvestorsListSummary } from '../shared/utils/investor-list-row.util';
import {
  AssetsListCacheEntry,
  AssetsPagedListState,
  CapitalDashboardState,
  FundsDetailState,
  FundsListCacheEntry,
  FundsPagedListState,
  InvestorsDetailState,
  InvestorsListCacheEntry,
  InvestorsPagedListState,
  initialCapitalDashboardState,
  PagedListState,
} from './capital-dashboard.state';
import {
  AssetsApiActions,
  CapitalDashboardCacheActions,
  CapitalDashboardShellActions,
  FundsApiActions,
  InvestorsApiActions,
} from './capital-dashboard.actions';
import {
  AssetsListSummaryDto,
  AssetsPagedResult,
  FundsListSummaryDto,
  FundsPagedResult,
  InvestorsListSummaryDto,
  InvestorsPagedResult,
  PagedResult,
} from '../shared/models/api.models';

function applyPagedList<T>(
  state: PagedListState<T>,
  result: { items?: T[] | PagedResult<T> | null; page?: number; totalCount?: number; hasNextPage?: boolean },
  replace: boolean,
): PagedListState<T> {
  const items = extractPagedItems(result.items ?? (result as PagedResult<T>));
  return {
    ...state,
    items: replace ? [...items] : [...state.items, ...items],
    page: result.page ?? (replace ? 1 : state.page + 1),
    totalCount: result.totalCount ?? 0,
    hasNextPage: !!result.hasNextPage,
    loading: false,
    loadingMore: false,
    error: null,
  };
}

function emptyFundCommitmentsDetail(): Pick<
  FundsDetailState,
  | 'commitmentsTimeframe'
  | 'commitments'
  | 'commitmentsPage'
  | 'commitmentsSearch'
  | 'commitmentsHasNextPage'
  | 'commitmentsLoading'
  | 'commitmentsLoadingMore'
  | 'commitmentsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    commitmentsTimeframe: d.commitmentsTimeframe,
    commitments: d.commitments,
    commitmentsPage: d.commitmentsPage,
    commitmentsSearch: d.commitmentsSearch,
    commitmentsHasNextPage: d.commitmentsHasNextPage,
    commitmentsLoading: d.commitmentsLoading,
    commitmentsLoadingMore: d.commitmentsLoadingMore,
    commitmentsError: d.commitmentsError,
  };
}

function emptyFundUnfundedCommitmentsDetail(): Pick<
  FundsDetailState,
  | 'unfundedCommitmentsTimeframe'
  | 'unfundedCommitments'
  | 'unfundedCommitmentsPage'
  | 'unfundedCommitmentsSearch'
  | 'unfundedCommitmentsHasNextPage'
  | 'unfundedCommitmentsLoading'
  | 'unfundedCommitmentsLoadingMore'
  | 'unfundedCommitmentsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    unfundedCommitmentsTimeframe: d.unfundedCommitmentsTimeframe,
    unfundedCommitments: d.unfundedCommitments,
    unfundedCommitmentsPage: d.unfundedCommitmentsPage,
    unfundedCommitmentsSearch: d.unfundedCommitmentsSearch,
    unfundedCommitmentsHasNextPage: d.unfundedCommitmentsHasNextPage,
    unfundedCommitmentsLoading: d.unfundedCommitmentsLoading,
    unfundedCommitmentsLoadingMore: d.unfundedCommitmentsLoadingMore,
    unfundedCommitmentsError: d.unfundedCommitmentsError,
  };
}

function emptyFundInvestmentsDetail(): Pick<
  FundsDetailState,
  | 'fundInvestmentsTimeframe'
  | 'fundInvestments'
  | 'fundInvestmentsPage'
  | 'fundInvestmentsSearch'
  | 'fundInvestmentsHasNextPage'
  | 'fundInvestmentsLoading'
  | 'fundInvestmentsLoadingMore'
  | 'fundInvestmentsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    fundInvestmentsTimeframe: d.fundInvestmentsTimeframe,
    fundInvestments: d.fundInvestments,
    fundInvestmentsPage: d.fundInvestmentsPage,
    fundInvestmentsSearch: d.fundInvestmentsSearch,
    fundInvestmentsHasNextPage: d.fundInvestmentsHasNextPage,
    fundInvestmentsLoading: d.fundInvestmentsLoading,
    fundInvestmentsLoadingMore: d.fundInvestmentsLoadingMore,
    fundInvestmentsError: d.fundInvestmentsError,
  };
}

function emptyFundDistributionsDetail(): Pick<
  FundsDetailState,
  | 'fundDistributionsTimeframe'
  | 'fundDistributions'
  | 'fundDistributionsPage'
  | 'fundDistributionsSearch'
  | 'fundDistributionsHasNextPage'
  | 'fundDistributionsLoading'
  | 'fundDistributionsLoadingMore'
  | 'fundDistributionsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    fundDistributionsTimeframe: d.fundDistributionsTimeframe,
    fundDistributions: d.fundDistributions,
    fundDistributionsPage: d.fundDistributionsPage,
    fundDistributionsSearch: d.fundDistributionsSearch,
    fundDistributionsHasNextPage: d.fundDistributionsHasNextPage,
    fundDistributionsLoading: d.fundDistributionsLoading,
    fundDistributionsLoadingMore: d.fundDistributionsLoadingMore,
    fundDistributionsError: d.fundDistributionsError,
  };
}

function emptyFundNavDetail(): Pick<
  FundsDetailState,
  | 'navTimeframe'
  | 'nav'
  | 'navPage'
  | 'navSearch'
  | 'navHasNextPage'
  | 'navLoading'
  | 'navLoadingMore'
  | 'navError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    navTimeframe: d.navTimeframe,
    nav: d.nav,
    navPage: d.navPage,
    navSearch: d.navSearch,
    navHasNextPage: d.navHasNextPage,
    navLoading: d.navLoading,
    navLoadingMore: d.navLoadingMore,
    navError: d.navError,
  };
}

function emptyFundCapitalActivitiesDetail(): Pick<
  FundsDetailState,
  | 'capitalActivitiesTimeframe'
  | 'capitalActivities'
  | 'capitalActivitiesPage'
  | 'capitalActivitiesPageSize'
  | 'capitalActivitiesTotalCount'
  | 'capitalActivitiesTotalPages'
  | 'capitalActivitiesSearch'
  | 'capitalActivitiesInvestorName'
  | 'capitalActivitiesHasNextPage'
  | 'capitalActivitiesHasPreviousPage'
  | 'capitalActivitiesLoading'
  | 'capitalActivitiesError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    capitalActivitiesTimeframe: d.capitalActivitiesTimeframe,
    capitalActivities: d.capitalActivities,
    capitalActivitiesPage: d.capitalActivitiesPage,
    capitalActivitiesPageSize: d.capitalActivitiesPageSize,
    capitalActivitiesTotalCount: d.capitalActivitiesTotalCount,
    capitalActivitiesTotalPages: d.capitalActivitiesTotalPages,
    capitalActivitiesSearch: d.capitalActivitiesSearch,
    capitalActivitiesInvestorName: d.capitalActivitiesInvestorName,
    capitalActivitiesHasNextPage: d.capitalActivitiesHasNextPage,
    capitalActivitiesHasPreviousPage: d.capitalActivitiesHasPreviousPage,
    capitalActivitiesLoading: d.capitalActivitiesLoading,
    capitalActivitiesError: d.capitalActivitiesError,
  };
}

function emptyFundDistributionTableDetail(): Pick<
  FundsDetailState,
  | 'distributionTableTimeframe'
  | 'distributionTable'
  | 'distributionTablePage'
  | 'distributionTablePageSize'
  | 'distributionTableTotalCount'
  | 'distributionTableTotalPages'
  | 'distributionTableSearch'
  | 'distributionTableInvestorName'
  | 'distributionTableHasNextPage'
  | 'distributionTableHasPreviousPage'
  | 'distributionTableLoading'
  | 'distributionTableError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    distributionTableTimeframe: d.distributionTableTimeframe,
    distributionTable: d.distributionTable,
    distributionTablePage: d.distributionTablePage,
    distributionTablePageSize: d.distributionTablePageSize,
    distributionTableTotalCount: d.distributionTableTotalCount,
    distributionTableTotalPages: d.distributionTableTotalPages,
    distributionTableSearch: d.distributionTableSearch,
    distributionTableInvestorName: d.distributionTableInvestorName,
    distributionTableHasNextPage: d.distributionTableHasNextPage,
    distributionTableHasPreviousPage: d.distributionTableHasPreviousPage,
    distributionTableLoading: d.distributionTableLoading,
    distributionTableError: d.distributionTableError,
  };
}

function emptyFundIrrDetail(): Pick<
  FundsDetailState,
  | 'irrTimeframe'
  | 'irr'
  | 'irrPage'
  | 'irrPageSize'
  | 'irrTotalCount'
  | 'irrTotalPages'
  | 'irrSearch'
  | 'irrInvestorName'
  | 'irrHasNextPage'
  | 'irrHasPreviousPage'
  | 'irrLoading'
  | 'irrError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    irrTimeframe: d.irrTimeframe,
    irr: d.irr,
    irrPage: d.irrPage,
    irrPageSize: d.irrPageSize,
    irrTotalCount: d.irrTotalCount,
    irrTotalPages: d.irrTotalPages,
    irrSearch: d.irrSearch,
    irrInvestorName: d.irrInvestorName,
    irrHasNextPage: d.irrHasNextPage,
    irrHasPreviousPage: d.irrHasPreviousPage,
    irrLoading: d.irrLoading,
    irrError: d.irrError,
  };
}

function emptyFundCapitalObligationsDetail(): Pick<
  FundsDetailState,
  | 'capitalObligationsTimeframe'
  | 'capitalObligations'
  | 'capitalObligationsPage'
  | 'capitalObligationsPageSize'
  | 'capitalObligationsTotalCount'
  | 'capitalObligationsTotalPages'
  | 'capitalObligationsSearch'
  | 'capitalObligationsInvestorName'
  | 'capitalObligationsHasNextPage'
  | 'capitalObligationsHasPreviousPage'
  | 'capitalObligationsLoading'
  | 'capitalObligationsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    capitalObligationsTimeframe: d.capitalObligationsTimeframe,
    capitalObligations: d.capitalObligations,
    capitalObligationsPage: d.capitalObligationsPage,
    capitalObligationsPageSize: d.capitalObligationsPageSize,
    capitalObligationsTotalCount: d.capitalObligationsTotalCount,
    capitalObligationsTotalPages: d.capitalObligationsTotalPages,
    capitalObligationsSearch: d.capitalObligationsSearch,
    capitalObligationsInvestorName: d.capitalObligationsInvestorName,
    capitalObligationsHasNextPage: d.capitalObligationsHasNextPage,
    capitalObligationsHasPreviousPage: d.capitalObligationsHasPreviousPage,
    capitalObligationsLoading: d.capitalObligationsLoading,
    capitalObligationsError: d.capitalObligationsError,
  };
}

function emptyFundNetAssetsDetail(): Pick<
  FundsDetailState,
  | 'netAssetsTimeframe'
  | 'netAssets'
  | 'netAssetsPage'
  | 'netAssetsPageSize'
  | 'netAssetsTotalCount'
  | 'netAssetsTotalPages'
  | 'netAssetsSearch'
  | 'netAssetsInvestorName'
  | 'netAssetsHasNextPage'
  | 'netAssetsHasPreviousPage'
  | 'netAssetsLoading'
  | 'netAssetsError'
> {
  const d = initialCapitalDashboardState.funds.detail;
  return {
    netAssetsTimeframe: d.netAssetsTimeframe,
    netAssets: d.netAssets,
    netAssetsPage: d.netAssetsPage,
    netAssetsPageSize: d.netAssetsPageSize,
    netAssetsTotalCount: d.netAssetsTotalCount,
    netAssetsTotalPages: d.netAssetsTotalPages,
    netAssetsSearch: d.netAssetsSearch,
    netAssetsInvestorName: d.netAssetsInvestorName,
    netAssetsHasNextPage: d.netAssetsHasNextPage,
    netAssetsHasPreviousPage: d.netAssetsHasPreviousPage,
    netAssetsLoading: d.netAssetsLoading,
    netAssetsError: d.netAssetsError,
  };
}

function emptyInvestorCommitmentsDetail(): Pick<
  InvestorsDetailState,
  | 'commitmentsTimeframe'
  | 'commitments'
  | 'commitmentsPage'
  | 'commitmentsSearch'
  | 'commitmentsHasNextPage'
  | 'commitmentsLoading'
  | 'commitmentsLoadingMore'
  | 'commitmentsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    commitmentsTimeframe: d.commitmentsTimeframe,
    commitments: d.commitments,
    commitmentsPage: d.commitmentsPage,
    commitmentsSearch: d.commitmentsSearch,
    commitmentsHasNextPage: d.commitmentsHasNextPage,
    commitmentsLoading: d.commitmentsLoading,
    commitmentsLoadingMore: d.commitmentsLoadingMore,
    commitmentsError: d.commitmentsError,
  };
}

function emptyInvestorUnfundedCommitmentsDetail(): Pick<
  InvestorsDetailState,
  | 'unfundedCommitmentsTimeframe'
  | 'unfundedCommitments'
  | 'unfundedCommitmentsPage'
  | 'unfundedCommitmentsSearch'
  | 'unfundedCommitmentsHasNextPage'
  | 'unfundedCommitmentsLoading'
  | 'unfundedCommitmentsLoadingMore'
  | 'unfundedCommitmentsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    unfundedCommitmentsTimeframe: d.unfundedCommitmentsTimeframe,
    unfundedCommitments: d.unfundedCommitments,
    unfundedCommitmentsPage: d.unfundedCommitmentsPage,
    unfundedCommitmentsSearch: d.unfundedCommitmentsSearch,
    unfundedCommitmentsHasNextPage: d.unfundedCommitmentsHasNextPage,
    unfundedCommitmentsLoading: d.unfundedCommitmentsLoading,
    unfundedCommitmentsLoadingMore: d.unfundedCommitmentsLoadingMore,
    unfundedCommitmentsError: d.unfundedCommitmentsError,
  };
}

function emptyInvestorCapitalInvestmentsDetail(): Pick<
  InvestorsDetailState,
  | 'capitalInvestments'
  | 'capitalInvestmentsPage'
  | 'capitalInvestmentsPageSize'
  | 'capitalInvestmentsTotalCount'
  | 'capitalInvestmentsTotalPages'
  | 'capitalInvestmentsHasNextPage'
  | 'capitalInvestmentsHasPreviousPage'
  | 'capitalInvestmentsLoading'
  | 'capitalInvestmentsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    capitalInvestments: d.capitalInvestments,
    capitalInvestmentsPage: d.capitalInvestmentsPage,
    capitalInvestmentsPageSize: d.capitalInvestmentsPageSize,
    capitalInvestmentsTotalCount: d.capitalInvestmentsTotalCount,
    capitalInvestmentsTotalPages: d.capitalInvestmentsTotalPages,
    capitalInvestmentsHasNextPage: d.capitalInvestmentsHasNextPage,
    capitalInvestmentsHasPreviousPage: d.capitalInvestmentsHasPreviousPage,
    capitalInvestmentsLoading: d.capitalInvestmentsLoading,
    capitalInvestmentsError: d.capitalInvestmentsError,
  };
}

function emptyInvestorDistributionsDetail(): Pick<
  InvestorsDetailState,
  | 'investorDistributionsTimeframe'
  | 'investorDistributions'
  | 'investorDistributionsPage'
  | 'investorDistributionsSearch'
  | 'investorDistributionsHasNextPage'
  | 'investorDistributionsLoading'
  | 'investorDistributionsLoadingMore'
  | 'investorDistributionsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    investorDistributionsTimeframe: d.investorDistributionsTimeframe,
    investorDistributions: d.investorDistributions,
    investorDistributionsPage: d.investorDistributionsPage,
    investorDistributionsSearch: d.investorDistributionsSearch,
    investorDistributionsHasNextPage: d.investorDistributionsHasNextPage,
    investorDistributionsLoading: d.investorDistributionsLoading,
    investorDistributionsLoadingMore: d.investorDistributionsLoadingMore,
    investorDistributionsError: d.investorDistributionsError,
  };
}

function emptyInvestorNavDetail(): Pick<
  InvestorsDetailState,
  | 'navTimeframe'
  | 'nav'
  | 'navPage'
  | 'navSearch'
  | 'navHasNextPage'
  | 'navLoading'
  | 'navLoadingMore'
  | 'navError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    navTimeframe: d.navTimeframe,
    nav: d.nav,
    navPage: d.navPage,
    navSearch: d.navSearch,
    navHasNextPage: d.navHasNextPage,
    navLoading: d.navLoading,
    navLoadingMore: d.navLoadingMore,
    navError: d.navError,
  };
}

function emptyInvestorCapitalActivitiesDetail(): Pick<
  InvestorsDetailState,
  | 'capitalActivitiesTimeframe'
  | 'capitalActivities'
  | 'capitalActivitiesPage'
  | 'capitalActivitiesPageSize'
  | 'capitalActivitiesTotalCount'
  | 'capitalActivitiesTotalPages'
  | 'capitalActivitiesSearch'
  | 'capitalActivitiesFundCode'
  | 'capitalActivitiesHasNextPage'
  | 'capitalActivitiesHasPreviousPage'
  | 'capitalActivitiesLoading'
  | 'capitalActivitiesError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    capitalActivitiesTimeframe: d.capitalActivitiesTimeframe,
    capitalActivities: d.capitalActivities,
    capitalActivitiesPage: d.capitalActivitiesPage,
    capitalActivitiesPageSize: d.capitalActivitiesPageSize,
    capitalActivitiesTotalCount: d.capitalActivitiesTotalCount,
    capitalActivitiesTotalPages: d.capitalActivitiesTotalPages,
    capitalActivitiesSearch: d.capitalActivitiesSearch,
    capitalActivitiesFundCode: d.capitalActivitiesFundCode,
    capitalActivitiesHasNextPage: d.capitalActivitiesHasNextPage,
    capitalActivitiesHasPreviousPage: d.capitalActivitiesHasPreviousPage,
    capitalActivitiesLoading: d.capitalActivitiesLoading,
    capitalActivitiesError: d.capitalActivitiesError,
  };
}

function emptyInvestorDistributionTableDetail(): Pick<
  InvestorsDetailState,
  | 'distributionTableTimeframe'
  | 'distributionTable'
  | 'distributionTablePage'
  | 'distributionTablePageSize'
  | 'distributionTableTotalCount'
  | 'distributionTableTotalPages'
  | 'distributionTableSearch'
  | 'distributionTableFundCode'
  | 'distributionTableHasNextPage'
  | 'distributionTableHasPreviousPage'
  | 'distributionTableLoading'
  | 'distributionTableError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    distributionTableTimeframe: d.distributionTableTimeframe,
    distributionTable: d.distributionTable,
    distributionTablePage: d.distributionTablePage,
    distributionTablePageSize: d.distributionTablePageSize,
    distributionTableTotalCount: d.distributionTableTotalCount,
    distributionTableTotalPages: d.distributionTableTotalPages,
    distributionTableSearch: d.distributionTableSearch,
    distributionTableFundCode: d.distributionTableFundCode,
    distributionTableHasNextPage: d.distributionTableHasNextPage,
    distributionTableHasPreviousPage: d.distributionTableHasPreviousPage,
    distributionTableLoading: d.distributionTableLoading,
    distributionTableError: d.distributionTableError,
  };
}

function emptyInvestorIrrDetail(): Pick<
  InvestorsDetailState,
  | 'irrTimeframe'
  | 'irr'
  | 'irrPage'
  | 'irrPageSize'
  | 'irrTotalCount'
  | 'irrTotalPages'
  | 'irrSearch'
  | 'irrFundCode'
  | 'irrHasNextPage'
  | 'irrHasPreviousPage'
  | 'irrLoading'
  | 'irrError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    irrTimeframe: d.irrTimeframe,
    irr: d.irr,
    irrPage: d.irrPage,
    irrPageSize: d.irrPageSize,
    irrTotalCount: d.irrTotalCount,
    irrTotalPages: d.irrTotalPages,
    irrSearch: d.irrSearch,
    irrFundCode: d.irrFundCode,
    irrHasNextPage: d.irrHasNextPage,
    irrHasPreviousPage: d.irrHasPreviousPage,
    irrLoading: d.irrLoading,
    irrError: d.irrError,
  };
}

function emptyInvestorCapitalObligationsDetail(): Pick<
  InvestorsDetailState,
  | 'capitalObligationsTimeframe'
  | 'capitalObligations'
  | 'capitalObligationsPage'
  | 'capitalObligationsPageSize'
  | 'capitalObligationsTotalCount'
  | 'capitalObligationsTotalPages'
  | 'capitalObligationsSearch'
  | 'capitalObligationsFundCode'
  | 'capitalObligationsHasNextPage'
  | 'capitalObligationsHasPreviousPage'
  | 'capitalObligationsLoading'
  | 'capitalObligationsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    capitalObligationsTimeframe: d.capitalObligationsTimeframe,
    capitalObligations: d.capitalObligations,
    capitalObligationsPage: d.capitalObligationsPage,
    capitalObligationsPageSize: d.capitalObligationsPageSize,
    capitalObligationsTotalCount: d.capitalObligationsTotalCount,
    capitalObligationsTotalPages: d.capitalObligationsTotalPages,
    capitalObligationsSearch: d.capitalObligationsSearch,
    capitalObligationsFundCode: d.capitalObligationsFundCode,
    capitalObligationsHasNextPage: d.capitalObligationsHasNextPage,
    capitalObligationsHasPreviousPage: d.capitalObligationsHasPreviousPage,
    capitalObligationsLoading: d.capitalObligationsLoading,
    capitalObligationsError: d.capitalObligationsError,
  };
}

function emptyInvestorNetAssetsDetail(): Pick<
  InvestorsDetailState,
  | 'netAssetsTimeframe'
  | 'netAssets'
  | 'netAssetsPage'
  | 'netAssetsPageSize'
  | 'netAssetsTotalCount'
  | 'netAssetsTotalPages'
  | 'netAssetsSearch'
  | 'netAssetsFundCode'
  | 'netAssetsHasNextPage'
  | 'netAssetsHasPreviousPage'
  | 'netAssetsLoading'
  | 'netAssetsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    netAssetsTimeframe: d.netAssetsTimeframe,
    netAssets: d.netAssets,
    netAssetsPage: d.netAssetsPage,
    netAssetsPageSize: d.netAssetsPageSize,
    netAssetsTotalCount: d.netAssetsTotalCount,
    netAssetsTotalPages: d.netAssetsTotalPages,
    netAssetsSearch: d.netAssetsSearch,
    netAssetsFundCode: d.netAssetsFundCode,
    netAssetsHasNextPage: d.netAssetsHasNextPage,
    netAssetsHasPreviousPage: d.netAssetsHasPreviousPage,
    netAssetsLoading: d.netAssetsLoading,
    netAssetsError: d.netAssetsError,
  };
}

function emptyInvestorFundHoldingsDetail(): Pick<
  InvestorsDetailState,
  | 'fundHoldings'
  | 'fundHoldingsDateKey'
  | 'fundHoldingsLoading'
  | 'fundHoldingsError'
> {
  const d = initialCapitalDashboardState.investors.detail;
  return {
    fundHoldings: d.fundHoldings,
    fundHoldingsDateKey: d.fundHoldingsDateKey,
    fundHoldingsLoading: d.fundHoldingsLoading,
    fundHoldingsError: d.fundHoldingsError,
  };
}

function listLoadingState<T>(
  state: PagedListState<T>,
  search: string,
  replace: boolean,
  listScope = state.listScope,
): PagedListState<T> {
  return {
    ...state,
    search,
    listScope,
    loading: replace,
    loadingMore: !replace,
    error: null,
    ...(replace ? { hasNextPage: false } : {}),
  };
}

function investorsListLoadingState(
  state: InvestorsPagedListState,
  search: string,
  replace: boolean,
  listScope = state.listScope,
): InvestorsPagedListState {
  return {
    ...listLoadingState(state, search, replace, listScope),
    summary: replace ? null : state.summary,
  };
}

function readInvestorsListSummary(
  result: InvestorsPagedResult | InvestorsListCacheEntry,
): InvestorsListSummaryDto | null {
  return (
    extractInvestorsListSummary(result) ??
    ('summary' in result ? (result.summary ?? null) : null)
  );
}

function applyInvestorsPagedList(
  state: InvestorsPagedListState,
  result: InvestorsPagedResult | InvestorsListCacheEntry,
  replace: boolean,
): InvestorsPagedListState {
  const summary = readInvestorsListSummary(result);
  return {
    ...applyPagedList(state, result, replace),
    summary: summary ?? (replace ? null : state.summary),
  };
}

function fundsListLoadingState(
  state: FundsPagedListState,
  search: string,
  replace: boolean,
  listScope = state.listScope,
): FundsPagedListState {
  return {
    ...listLoadingState(state, search, replace, listScope),
    summary: replace ? null : state.summary,
  };
}

function readFundsListSummary(
  result: FundsPagedResult | FundsListCacheEntry,
): FundsListSummaryDto | null {
  return (
    extractFundsListSummary(result) ??
    ('summary' in result ? (result.summary ?? null) : null)
  );
}

function applyFundsPagedList(
  state: FundsPagedListState,
  result: FundsPagedResult | FundsListCacheEntry,
  replace: boolean,
): FundsPagedListState {
  const summary = readFundsListSummary(result);
  return {
    ...applyPagedList(state, result, replace),
    summary: summary ?? (replace ? null : state.summary),
  };
}

function assetsListLoadingState(
  state: AssetsPagedListState,
  search: string,
  replace: boolean,
  listScope = state.listScope,
): AssetsPagedListState {
  return {
    ...listLoadingState(state, search, replace, listScope),
    summary: replace ? null : state.summary,
  };
}

function readAssetsListSummary(
  result: AssetsPagedResult | AssetsListCacheEntry,
): AssetsListSummaryDto | null {
  return (
    extractAssetsListSummary(result) ??
    ('summary' in result ? (result.summary ?? null) : null)
  );
}

function applyAssetsPagedList(
  state: AssetsPagedListState,
  result: AssetsPagedResult | AssetsListCacheEntry,
  replace: boolean,
): AssetsPagedListState {
  const summary = readAssetsListSummary(result);
  return {
    ...applyPagedList(state, result, replace),
    summary: summary ?? (replace ? null : state.summary),
  };
}

export const capitalDashboardFeature = createFeature({
  name: 'capitalDashboard',
  reducer: createReducer(
    initialCapitalDashboardState,

    on(CapitalDashboardCacheActions.resetAll, () => initialCapitalDashboardState),

    on(CapitalDashboardShellActions.activeTabChanged, (state, { tab }) => ({
      ...state,
      activeTab: tab,
    })),

    // Investors list
    on(InvestorsApiActions.loadList, (state, { search, page, replace, cacheKey }) => {
      const scope = cacheKey ?? '';
      const cached = readInvestorsListCacheEntry(state.investors.cache.lists, search, page, scope);
      if (cached) {
        const list = investorsListStateFromCacheEntry(search, cached, scope);
        return {
          ...state,
          investors: {
            ...state.investors,
            list: replace ? list : applyInvestorsPagedList(state.investors.list, cached, false),
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          list: investorsListLoadingState(state.investors.list, search, replace, scope),
        },
      };
    }),
    on(InvestorsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.investors.list.search;
      const scope = state.investors.list.listScope;
      const page = result.page ?? state.investors.list.page;
      return {
        ...state,
        investors: {
          ...state.investors,
          list: applyInvestorsPagedList(state.investors.list, result, replace),
          cache: {
            ...state.investors.cache,
            lists: writeInvestorsListCacheEntry(state.investors.cache.lists, search, result, page, scope),
          },
        },
      };
    }),
    on(InvestorsApiActions.loadListFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        list: {
          ...state.investors.list,
          loading: false,
          loadingMore: false,
          error,
        },
      },
    })),

    // Investors detail
    on(InvestorsApiActions.loadDetail, (state, { investorKey }) => {
      const cached = state.investors.cache.details[investorKey];
      if (cached) {
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...emptyInvestorCommitmentsDetail(),
              ...emptyInvestorUnfundedCommitmentsDetail(),
              ...emptyInvestorCapitalInvestmentsDetail(),
              ...emptyInvestorDistributionsDetail(),
              ...emptyInvestorNavDetail(),
              ...emptyInvestorCapitalActivitiesDetail(),
              ...emptyInvestorDistributionTableDetail(),
              ...emptyInvestorIrrDetail(),
              ...emptyInvestorCapitalObligationsDetail(),
              ...emptyInvestorNetAssetsDetail(),
              ...emptyInvestorFundHoldingsDetail(),
              selectedKey: investorKey,
              detail: cached.detail,
              investments: [...cached.investments],
              investmentsPage: cached.investmentsPage,
              investmentsSearch: '',
              investmentsHasNextPage: cached.investmentsHasNextPage,
              investmentsLoading: false,
              investmentsLoadingMore: false,
              loading: false,
              error: null,
            },
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          detail: {
            ...emptyInvestorCommitmentsDetail(),
            ...emptyInvestorUnfundedCommitmentsDetail(),
            ...emptyInvestorCapitalInvestmentsDetail(),
            ...emptyInvestorDistributionsDetail(),
            ...emptyInvestorNavDetail(),
            ...emptyInvestorCapitalActivitiesDetail(),
            ...emptyInvestorDistributionTableDetail(),
            ...emptyInvestorIrrDetail(),
            ...emptyInvestorCapitalObligationsDetail(),
            ...emptyInvestorNetAssetsDetail(),
            ...emptyInvestorFundHoldingsDetail(),
            selectedKey: investorKey,
            detail: null,
            investments: [],
            investmentsPage: 1,
            investmentsSearch: '',
            investmentsHasNextPage: false,
            investmentsLoading: false,
            investmentsLoadingMore: false,
            loading: true,
            error: null,
          },
        },
      };
    }),
    on(
      InvestorsApiActions.loadDetailSuccess,
      (state, { investorKey, detail, investments, investmentsHasNextPage }) => {
        const investorFunds = [...investments];
        const entry: InvestorDetailCacheEntry = {
          detail,
          investments: investorFunds,
          investmentsPage: 1,
          investmentsHasNextPage,
        };
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              detail,
              investments: investorFunds,
              investmentsPage: 1,
              investmentsSearch: '',
              investmentsHasNextPage,
              investmentsLoading: false,
              investmentsLoadingMore: false,
              loading: false,
              error: null,
            },
            cache: {
              ...state.investors.cache,
              details: {
                ...state.investors.cache.details,
                [investorKey]: entry,
              },
            },
          },
        };
      },
    ),
    on(InvestorsApiActions.loadDetailFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          detail: null,
          investments: [],
          loading: false,
          error,
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorFundsPage, (state, { page, search }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          investmentsSearch: search,
          investmentsLoading: page === 1,
          investmentsLoadingMore: page > 1,
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorFundsPageSuccess, (state, { page, items, hasNextPage, append }) => {
      const investorKey = state.investors.detail.selectedKey;
      const nextInvestments = append
        ? [...state.investors.detail.investments, ...items]
        : [...items];
      const nextDetail = {
        ...state.investors.detail,
        investmentsPage: page,
        investments: nextInvestments,
        investmentsHasNextPage: hasNextPage,
        investmentsLoading: false,
        investmentsLoadingMore: false,
      };
      const nextCache = { ...state.investors.cache };
      if (investorKey != null) {
        const cached = nextCache.details[investorKey];
        if (cached) {
          nextCache.details = {
            ...nextCache.details,
            [investorKey]: {
              ...cached,
              investments: [...nextInvestments],
              investmentsPage: page,
              investmentsHasNextPage: hasNextPage,
            },
          };
        }
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          detail: nextDetail,
          cache: nextCache,
        },
      };
    }),
    on(InvestorsApiActions.loadInvestorFundsPageFailure, (state) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          investmentsLoading: false,
          investmentsLoadingMore: false,
        },
      },
    })),
    on(InvestorsApiActions.clearDetail, (state) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: initialCapitalDashboardState.investors.detail,
      },
    })),

    on(InvestorsApiActions.loadInvestorPeriodsSuccess, (state, { investorKey, source, view, items }) => ({
      ...state,
      investors: {
        ...state.investors,
        cache: {
          ...state.investors.cache,
          periodLists: writeInvestorPeriodsCache(state.investors.cache.periodLists, investorKey, source, view, items),
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorPeriodsFailure, (state) => state),
    on(
      InvestorsApiActions.loadInvestorCommitmentsPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.investors.detail.selectedKey === investorKey &&
          state.investors.detail.commitmentsTimeframe === timeframe &&
          state.investors.detail.commitmentsSearch === search &&
          (state.investors.detail.commitmentsLoading || state.investors.detail.commitmentsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readInvestorCommitmentsPageCache(state.investors.cache.commitmentPages, investorKey, timeframe, page, dateKey);
        if (cached) {
          const nextCommitments = replace
            ? [...cached.items]
            : [...state.investors.detail.commitments, ...cached.items];
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                commitmentsTimeframe: timeframe,
                commitments: nextCommitments,
                commitmentsPage: page,
                commitmentsSearch: search,
                commitmentsHasNextPage: cached.hasNextPage,
                commitmentsLoading: false,
                commitmentsLoadingMore: false,
                commitmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              commitmentsTimeframe: timeframe,
              commitmentsSearch: search,
              commitmentsLoading: replace,
              commitmentsLoadingMore: !replace,
              commitmentsError: null,
              ...(replace ? { commitments: [], commitmentsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorCommitmentsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const investorKey = state.investors.detail.selectedKey;
        const nextCommitments = replace ? [...items] : [...state.investors.detail.commitments, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            commitmentPages: writeInvestorCommitmentsPageCache(
              nextCache.commitmentPages,
              investorKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              commitmentsTimeframe: timeframe,
              commitments: nextCommitments,
              commitmentsPage: page,
              commitmentsSearch: search,
              commitmentsHasNextPage: hasNextPage,
              commitmentsLoading: false,
              commitmentsLoadingMore: false,
              commitmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorCommitmentsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          commitmentsLoading: false,
          commitmentsLoadingMore: false,
          commitmentsError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorUnfundedCommitmentsPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.investors.detail.selectedKey === investorKey &&
          state.investors.detail.unfundedCommitmentsTimeframe === timeframe &&
          state.investors.detail.unfundedCommitmentsSearch === search &&
          (state.investors.detail.unfundedCommitmentsLoading ||
            state.investors.detail.unfundedCommitmentsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readInvestorUnfundedCommitmentsPageCache(
            state.investors.cache.unfundedCommitmentPages,
            investorKey,
            timeframe,
            page,
            dateKey,
          );
        if (cached) {
          const nextRows = replace
            ? [...cached.items]
            : [...state.investors.detail.unfundedCommitments, ...cached.items];
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                unfundedCommitmentsTimeframe: timeframe,
                unfundedCommitments: nextRows,
                unfundedCommitmentsPage: page,
                unfundedCommitmentsSearch: search,
                unfundedCommitmentsHasNextPage: cached.hasNextPage,
                unfundedCommitmentsLoading: false,
                unfundedCommitmentsLoadingMore: false,
                unfundedCommitmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              unfundedCommitmentsTimeframe: timeframe,
              unfundedCommitmentsSearch: search,
              unfundedCommitmentsLoading: replace,
              unfundedCommitmentsLoadingMore: !replace,
              unfundedCommitmentsError: null,
              ...(replace ? { unfundedCommitments: [], unfundedCommitmentsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorUnfundedCommitmentsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const investorKey = state.investors.detail.selectedKey;
        const nextRows = replace
          ? [...items]
          : [...state.investors.detail.unfundedCommitments, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            unfundedCommitmentPages: writeInvestorUnfundedCommitmentsPageCache(
              nextCache.unfundedCommitmentPages,
              investorKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              unfundedCommitmentsTimeframe: timeframe,
              unfundedCommitments: nextRows,
              unfundedCommitmentsPage: page,
              unfundedCommitmentsSearch: search,
              unfundedCommitmentsHasNextPage: hasNextPage,
              unfundedCommitmentsLoading: false,
              unfundedCommitmentsLoadingMore: false,
              unfundedCommitmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorUnfundedCommitmentsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          unfundedCommitmentsLoading: false,
          unfundedCommitmentsLoadingMore: false,
          unfundedCommitmentsError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorCapitalInvestmentsPage,
      (state, { investorKey, page, replace }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.investors.detail.selectedKey === investorKey &&
          state.investors.detail.capitalInvestmentsLoading;
        if (sameRequestInFlight) {
          return state;
        }

        const cached = readInvestorCapitalInvestmentsPageCache(
          state.investors.cache.capitalInvestmentPages,
          investorKey,
          page,
        );
        if (cached) {
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                capitalInvestments: [...cached.items],
                capitalInvestmentsPage: page,
                capitalInvestmentsPageSize: cached.pageSize,
                capitalInvestmentsTotalCount: cached.totalCount,
                capitalInvestmentsTotalPages: cached.totalPages,
                capitalInvestmentsHasNextPage: cached.hasNextPage,
                capitalInvestmentsHasPreviousPage: cached.hasPreviousPage,
                capitalInvestmentsLoading: false,
                capitalInvestmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              capitalInvestmentsLoading: replace,
              capitalInvestmentsError: null,
              ...(replace
                ? {
                    capitalInvestments: [],
                    capitalInvestmentsPage: page,
                    capitalInvestmentsTotalCount: 0,
                    capitalInvestmentsTotalPages: 0,
                    capitalInvestmentsHasNextPage: false,
                    capitalInvestmentsHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorCapitalInvestmentsPageSuccess,
      (
        state,
        {
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const nextItems = replace ? [...items] : [...state.investors.detail.capitalInvestments, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null) {
          nextCache = {
            ...nextCache,
            capitalInvestmentPages: writeInvestorCapitalInvestmentsPageCache(
              nextCache.capitalInvestmentPages,
              investorKey,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              capitalInvestments: nextItems,
              capitalInvestmentsPage: page,
              capitalInvestmentsPageSize: pageSize,
              capitalInvestmentsTotalCount: totalCount,
              capitalInvestmentsTotalPages: totalPages,
              capitalInvestmentsHasNextPage: hasNextPage,
              capitalInvestmentsHasPreviousPage: hasPreviousPage,
              capitalInvestmentsLoading: false,
              capitalInvestmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorCapitalInvestmentsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          capitalInvestmentsLoading: false,
          capitalInvestmentsError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorDistributionsPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.investors.detail.selectedKey === investorKey &&
          state.investors.detail.investorDistributionsTimeframe === timeframe &&
          state.investors.detail.investorDistributionsSearch === search &&
          (state.investors.detail.investorDistributionsLoading || state.investors.detail.investorDistributionsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readInvestorDistributionsPageCache(
            state.investors.cache.distributionPages,
            investorKey,
            timeframe,
            page,
            dateKey,
          );
        if (cached) {
          const nextRows = replace
            ? [...cached.items]
            : [...state.investors.detail.investorDistributions, ...cached.items];
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                investorDistributionsTimeframe: timeframe,
                investorDistributions: nextRows,
                investorDistributionsPage: page,
                investorDistributionsSearch: search,
                investorDistributionsHasNextPage: cached.hasNextPage,
                investorDistributionsLoading: false,
                investorDistributionsLoadingMore: false,
                investorDistributionsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              investorDistributionsTimeframe: timeframe,
              investorDistributionsSearch: search,
              investorDistributionsLoading: replace,
              investorDistributionsLoadingMore: !replace,
              investorDistributionsError: null,
              ...(replace ? { investorDistributions: [], investorDistributionsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorDistributionsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const investorKey = state.investors.detail.selectedKey;
        const nextRows = replace ? [...items] : [...state.investors.detail.investorDistributions, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            distributionPages: writeInvestorDistributionsPageCache(
              nextCache.distributionPages,
              investorKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              investorDistributionsTimeframe: timeframe,
              investorDistributions: nextRows,
              investorDistributionsPage: page,
              investorDistributionsSearch: search,
              investorDistributionsHasNextPage: hasNextPage,
              investorDistributionsLoading: false,
              investorDistributionsLoadingMore: false,
              investorDistributionsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorDistributionsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          investorDistributionsLoading: false,
          investorDistributionsLoadingMore: false,
          investorDistributionsError: error,
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorNavPage, (state, { investorKey, timeframe, page, search, replace, dateKey }) => {
      const sameRequestInFlight =
        replace &&
        page === 1 &&
        state.investors.detail.selectedKey === investorKey &&
        state.investors.detail.navTimeframe === timeframe &&
        state.investors.detail.navSearch === search &&
        (state.investors.detail.navLoading || state.investors.detail.navLoadingMore);
      if (sameRequestInFlight) {
        return state;
      }

      const cached =
        !search.trim() && readInvestorNavPageCache(state.investors.cache.navPages, investorKey, timeframe, page, dateKey);
      if (cached) {
        const nextNav = replace ? [...cached.items] : [...state.investors.detail.nav, ...cached.items];
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              navTimeframe: timeframe,
              nav: nextNav,
              navPage: page,
              navSearch: search,
              navHasNextPage: cached.hasNextPage,
              navLoading: false,
              navLoadingMore: false,
              navError: null,
            },
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          detail: {
            ...state.investors.detail,
            selectedKey: investorKey,
            navTimeframe: timeframe,
            navSearch: search,
            navLoading: replace,
            navLoadingMore: !replace,
            navError: null,
            ...(replace ? { nav: [], navHasNextPage: false } : {}),
          },
        },
      };
    }),
    on(
      InvestorsApiActions.loadInvestorNavPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const investorKey = state.investors.detail.selectedKey;
        const nextNav = replace ? [...items] : [...state.investors.detail.nav, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            navPages: writeInvestorNavPageCache(
              nextCache.navPages,
              investorKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              navTimeframe: timeframe,
              nav: nextNav,
              navPage: page,
              navSearch: search,
              navHasNextPage: hasNextPage,
              navLoading: false,
              navLoadingMore: false,
              navError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorNavPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          navLoading: false,
          navLoadingMore: false,
          navError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorCapitalActivitiesPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey, calendarYear, fundCode, sortBy }) => {
        const fund = fundCode?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readInvestorCapitalActivitiesPageCache(
            state.investors.cache.capitalActivitiesPages,
            investorKey,
            timeframe,
            page,
            dateKey,
            fund,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                capitalActivitiesTimeframe: timeframe,
                capitalActivities: [...cached.items],
                capitalActivitiesPage: page,
                capitalActivitiesPageSize: cached.pageSize,
                capitalActivitiesTotalCount: cached.totalCount,
                capitalActivitiesTotalPages: cached.totalPages,
                capitalActivitiesSearch: search,
                capitalActivitiesFundCode: fund,
                capitalActivitiesHasNextPage: cached.hasNextPage,
                capitalActivitiesHasPreviousPage: cached.hasPreviousPage,
                capitalActivitiesLoading: false,
                capitalActivitiesError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              capitalActivitiesTimeframe: timeframe,
              capitalActivitiesSearch: search,
              capitalActivitiesFundCode: fund,
              capitalActivitiesLoading: replace,
              capitalActivitiesError: null,
              ...(replace
                ? {
                    capitalActivities: [],
                    capitalActivitiesPage: page,
                    capitalActivitiesTotalCount: 0,
                    capitalActivitiesTotalPages: 0,
                    capitalActivitiesHasNextPage: false,
                    capitalActivitiesHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorCapitalActivitiesPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          fundCode,
          sortBy,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const fund = fundCode?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.investors.detail.capitalActivities, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            capitalActivitiesPages: writeInvestorCapitalActivitiesPageCache(
              nextCache.capitalActivitiesPages,
              investorKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              fund,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              capitalActivitiesTimeframe: timeframe,
              capitalActivities: nextItems,
              capitalActivitiesPage: page,
              capitalActivitiesPageSize: pageSize,
              capitalActivitiesTotalCount: totalCount,
              capitalActivitiesTotalPages: totalPages,
              capitalActivitiesSearch: search,
              capitalActivitiesFundCode: fund,
              capitalActivitiesHasNextPage: hasNextPage,
              capitalActivitiesHasPreviousPage: hasPreviousPage,
              capitalActivitiesLoading: false,
              capitalActivitiesError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorCapitalActivitiesPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          capitalActivitiesLoading: false,
          capitalActivitiesError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorDistributionTablePage,
      (state, { investorKey, timeframe, page, search, replace, dateKey, calendarYear, fundCode, sortBy }) => {
        const fund = fundCode?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readInvestorDistributionTablePageCache(
            state.investors.cache.distributionTablePages,
            investorKey,
            timeframe,
            page,
            dateKey,
            fund,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                distributionTableTimeframe: timeframe,
                distributionTable: [...cached.items],
                distributionTablePage: page,
                distributionTablePageSize: cached.pageSize,
                distributionTableTotalCount: cached.totalCount,
                distributionTableTotalPages: cached.totalPages,
                distributionTableSearch: search,
                distributionTableFundCode: fund,
                distributionTableHasNextPage: cached.hasNextPage,
                distributionTableHasPreviousPage: cached.hasPreviousPage,
                distributionTableLoading: false,
                distributionTableError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              distributionTableTimeframe: timeframe,
              distributionTableSearch: search,
              distributionTableFundCode: fund,
              distributionTableLoading: replace,
              distributionTableError: null,
              ...(replace
                ? {
                    distributionTable: [],
                    distributionTablePage: page,
                    distributionTableTotalCount: 0,
                    distributionTableTotalPages: 0,
                    distributionTableHasNextPage: false,
                    distributionTableHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorDistributionTablePageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          fundCode,
          sortBy,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const fund = fundCode?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.investors.detail.distributionTable, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            distributionTablePages: writeInvestorDistributionTablePageCache(
              nextCache.distributionTablePages,
              investorKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              fund,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              distributionTableTimeframe: timeframe,
              distributionTable: nextItems,
              distributionTablePage: page,
              distributionTablePageSize: pageSize,
              distributionTableTotalCount: totalCount,
              distributionTableTotalPages: totalPages,
              distributionTableSearch: search,
              distributionTableFundCode: fund,
              distributionTableHasNextPage: hasNextPage,
              distributionTableHasPreviousPage: hasPreviousPage,
              distributionTableLoading: false,
              distributionTableError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorDistributionTablePageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          distributionTableLoading: false,
          distributionTableError: error,
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorIrrPage, (state, { investorKey, timeframe, page, search, replace, dateKey, calendarYear, fundCode, sortBy }) => {
      const fund = fundCode?.trim() ?? '';

      const cached =
        !search.trim() &&
        !sortBy &&
        readInvestorIrrPageCache(state.investors.cache.irrPages, investorKey, timeframe, page, dateKey, fund, calendarYear);
      if (cached) {
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              irrTimeframe: timeframe,
              irr: [...cached.items],
              irrPage: page,
              irrPageSize: cached.pageSize,
              irrTotalCount: cached.totalCount,
              irrTotalPages: cached.totalPages,
              irrSearch: search,
              irrFundCode: fund,
              irrHasNextPage: cached.hasNextPage,
              irrHasPreviousPage: cached.hasPreviousPage,
              irrLoading: false,
              irrError: null,
            },
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          detail: {
            ...state.investors.detail,
            selectedKey: investorKey,
            irrTimeframe: timeframe,
            irrSearch: search,
            irrFundCode: fund,
            irrLoading: replace,
            irrError: null,
            ...(replace
              ? {
                  irr: [],
                  irrPage: page,
                  irrTotalCount: 0,
                  irrTotalPages: 0,
                  irrHasNextPage: false,
                  irrHasPreviousPage: false,
                }
              : {}),
          },
        },
      };
    }),
    on(
      InvestorsApiActions.loadInvestorIrrPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          fundCode,
          sortBy,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const fund = fundCode?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.investors.detail.irr, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            irrPages: writeInvestorIrrPageCache(
              nextCache.irrPages,
              investorKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              fund,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              irrTimeframe: timeframe,
              irr: nextItems,
              irrPage: page,
              irrPageSize: pageSize,
              irrTotalCount: totalCount,
              irrTotalPages: totalPages,
              irrSearch: search,
              irrFundCode: fund,
              irrHasNextPage: hasNextPage,
              irrHasPreviousPage: hasPreviousPage,
              irrLoading: false,
              irrError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorIrrPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          irrLoading: false,
          irrError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorCapitalObligationsPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey, calendarYear, fundCode, sortBy }) => {
        const fund = fundCode?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readInvestorCapitalObligationsPageCache(
            state.investors.cache.capitalObligationsPages,
            investorKey,
            timeframe,
            page,
            dateKey,
            fund,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                capitalObligationsTimeframe: timeframe,
                capitalObligations: [...cached.items],
                capitalObligationsPage: page,
                capitalObligationsPageSize: cached.pageSize,
                capitalObligationsTotalCount: cached.totalCount,
                capitalObligationsTotalPages: cached.totalPages,
                capitalObligationsSearch: search,
                capitalObligationsFundCode: fund,
                capitalObligationsHasNextPage: cached.hasNextPage,
                capitalObligationsHasPreviousPage: cached.hasPreviousPage,
                capitalObligationsLoading: false,
                capitalObligationsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              capitalObligationsTimeframe: timeframe,
              capitalObligationsSearch: search,
              capitalObligationsFundCode: fund,
              capitalObligationsLoading: replace,
              capitalObligationsError: null,
              ...(replace
                ? {
                    capitalObligations: [],
                    capitalObligationsPage: page,
                    capitalObligationsTotalCount: 0,
                    capitalObligationsTotalPages: 0,
                    capitalObligationsHasNextPage: false,
                    capitalObligationsHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorCapitalObligationsPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          fundCode,
          sortBy,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const fund = fundCode?.trim() ?? '';
        const nextItems = replace
          ? [...items]
          : [...state.investors.detail.capitalObligations, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            capitalObligationsPages: writeInvestorCapitalObligationsPageCache(
              nextCache.capitalObligationsPages,
              investorKey,
              timeframe,
              page,
              nextItems,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              fund,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              capitalObligationsTimeframe: timeframe,
              capitalObligations: nextItems,
              capitalObligationsPage: page,
              capitalObligationsPageSize: pageSize,
              capitalObligationsTotalCount: totalCount,
              capitalObligationsTotalPages: totalPages,
              capitalObligationsSearch: search,
              capitalObligationsFundCode: fund,
              capitalObligationsHasNextPage: hasNextPage,
              capitalObligationsHasPreviousPage: hasPreviousPage,
              capitalObligationsLoading: false,
              capitalObligationsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorCapitalObligationsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          capitalObligationsLoading: false,
          capitalObligationsError: error,
        },
      },
    })),
    on(
      InvestorsApiActions.loadInvestorNetAssetsPage,
      (state, { investorKey, timeframe, page, search, replace, dateKey, calendarYear, fundCode, sortBy }) => {
        const fund = fundCode?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readInvestorNetAssetsPageCache(
            state.investors.cache.netAssetsPages,
            investorKey,
            timeframe,
            page,
            dateKey,
            fund,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            investors: {
              ...state.investors,
              detail: {
                ...state.investors.detail,
                selectedKey: investorKey,
                netAssetsTimeframe: timeframe,
                netAssets: [...cached.items],
                netAssetsPage: page,
                netAssetsPageSize: cached.pageSize,
                netAssetsTotalCount: cached.totalCount,
                netAssetsTotalPages: cached.totalPages,
                netAssetsSearch: search,
                netAssetsFundCode: fund,
                netAssetsHasNextPage: cached.hasNextPage,
                netAssetsHasPreviousPage: cached.hasPreviousPage,
                netAssetsLoading: false,
                netAssetsError: null,
              },
            },
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              netAssetsTimeframe: timeframe,
              netAssetsSearch: search,
              netAssetsFundCode: fund,
              netAssetsLoading: replace,
              netAssetsError: null,
              ...(replace
                ? {
                    netAssets: [],
                    netAssetsPage: page,
                    netAssetsTotalCount: 0,
                    netAssetsTotalPages: 0,
                    netAssetsHasNextPage: false,
                    netAssetsHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      InvestorsApiActions.loadInvestorNetAssetsPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          fundCode,
          sortBy,
        },
      ) => {
        const investorKey = state.investors.detail.selectedKey;
        const fund = fundCode?.trim() ?? '';
        const nextItems = replace
          ? [...items]
          : [...state.investors.detail.netAssets, ...items];
        let nextCache = state.investors.cache;
        if (investorKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            netAssetsPages: writeInvestorNetAssetsPageCache(
              nextCache.netAssetsPages,
              investorKey,
              timeframe,
              page,
              nextItems,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              fund,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              netAssetsTimeframe: timeframe,
              netAssets: nextItems,
              netAssetsPage: page,
              netAssetsPageSize: pageSize,
              netAssetsTotalCount: totalCount,
              netAssetsTotalPages: totalPages,
              netAssetsSearch: search,
              netAssetsFundCode: fund,
              netAssetsHasNextPage: hasNextPage,
              netAssetsHasPreviousPage: hasPreviousPage,
              netAssetsLoading: false,
              netAssetsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorNetAssetsPageFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          netAssetsLoading: false,
          netAssetsError: error,
        },
      },
    })),
    on(InvestorsApiActions.loadInvestorFundHoldings, (state, { investorKey }) => {
      const sameRequestInFlight =
        state.investors.detail.selectedKey === investorKey &&
        state.investors.detail.fundHoldingsLoading;
      if (sameRequestInFlight) {
        return state;
      }

      const cached = readInvestorFundHoldingsCache(
        state.investors.cache.fundHoldingsPages,
        investorKey,
      );
      if (cached) {
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              selectedKey: investorKey,
              fundHoldings: [...cached.items],
              fundHoldingsDateKey: cached.dateKey,
              fundHoldingsLoading: false,
              fundHoldingsError: null,
            },
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          detail: {
            ...state.investors.detail,
            selectedKey: investorKey,
            fundHoldingsLoading: true,
            fundHoldingsError: null,
            fundHoldings: [],
            fundHoldingsDateKey: null,
          },
        },
      };
    }),
    on(
      InvestorsApiActions.loadInvestorFundHoldingsSuccess,
      (state, { items, dateKey }) => {
        const investorKey = state.investors.detail.selectedKey;
        let nextCache = state.investors.cache;
        if (investorKey != null) {
          nextCache = {
            ...nextCache,
            fundHoldingsPages: writeInvestorFundHoldingsCache(
              nextCache.fundHoldingsPages,
              investorKey,
              items,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          investors: {
            ...state.investors,
            detail: {
              ...state.investors.detail,
              fundHoldings: [...items],
              fundHoldingsDateKey: dateKey,
              fundHoldingsLoading: false,
              fundHoldingsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(InvestorsApiActions.loadInvestorFundHoldingsFailure, (state, { error }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          ...state.investors.detail,
          fundHoldingsLoading: false,
          fundHoldingsError: error,
        },
      },
    })),

    // Funds list
    on(FundsApiActions.loadList, (state, { search, page, replace, cacheKey }) => {
      const scope = cacheKey ?? '';
      const cached = readFundsListCacheEntry(state.funds.cache.lists, search, page, scope);
      if (cached) {
        const list = fundsListStateFromCacheEntry(search, cached, scope);
        return {
          ...state,
          funds: {
            ...state.funds,
            list: replace ? list : applyFundsPagedList(state.funds.list, cached, false),
          },
        };
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          list: fundsListLoadingState(state.funds.list, search, replace, scope),
        },
      };
    }),
    on(FundsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.funds.list.search;
      const scope = state.funds.list.listScope;
      const page = result.page ?? state.funds.list.page;
      return {
        ...state,
        funds: {
          ...state.funds,
          list: applyFundsPagedList(state.funds.list, result, replace),
          cache: {
            ...state.funds.cache,
            lists: writeFundsListCacheEntry(state.funds.cache.lists, search, result, page, scope),
          },
        },
      };
    }),
    on(FundsApiActions.loadListFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        list: {
          ...state.funds.list,
          loading: false,
          loadingMore: false,
          error,
        },
      },
    })),

    // Funds detail
    on(FundsApiActions.loadDetail, (state, { fundKey }) => {
      const cached = state.funds.cache.details[fundKey];
      if (cached) {
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...emptyFundCommitmentsDetail(),
              ...emptyFundUnfundedCommitmentsDetail(),
              ...emptyFundInvestmentsDetail(),
              ...emptyFundDistributionsDetail(),
              ...emptyFundNavDetail(),
              ...emptyFundCapitalActivitiesDetail(),
              ...emptyFundDistributionTableDetail(),
              ...emptyFundIrrDetail(),
              ...emptyFundCapitalObligationsDetail(),
              ...emptyFundNetAssetsDetail(),
              selectedKey: fundKey,
              detail: cached.detail,
              assets: [...cached.assets],
              assetsPage: cached.assetsPage,
              assetsPageSize: state.funds.detail.assetsPageSize,
              assetsTotalCount: state.funds.detail.assetsTotalCount,
              assetsTotalPages: state.funds.detail.assetsTotalPages,
              assetsSearch: '',
              assetsHasNextPage: cached.assetsHasNextPage,
              assetsHasPreviousPage: state.funds.detail.assetsHasPreviousPage,
              assetsLoading: false,
              fundInvestors: [...cached.fundInvestors],
              fundInvestorsPage: cached.fundInvestorsPage,
              fundInvestorsSearch: '',
              fundInvestorsHasNextPage: cached.fundInvestorsHasNextPage,
              fundInvestorsLoading: false,
              fundInvestorsLoadingMore: false,
              loading: false,
              error: null,
            },
          },
        };
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: {
            ...emptyFundCommitmentsDetail(),
            ...emptyFundUnfundedCommitmentsDetail(),
            ...emptyFundInvestmentsDetail(),
            ...emptyFundDistributionsDetail(),
            ...emptyFundNavDetail(),
            ...emptyFundCapitalActivitiesDetail(),
            ...emptyFundDistributionTableDetail(),
            ...emptyFundIrrDetail(),
            ...emptyFundCapitalObligationsDetail(),
            ...emptyFundNetAssetsDetail(),
            selectedKey: fundKey,
            detail: null,
            assets: [],
            assetsPage: 1,
            assetsPageSize: LIST_PAGE_SIZE,
            assetsTotalCount: 0,
            assetsTotalPages: 0,
            assetsSearch: '',
            assetsHasNextPage: false,
            assetsHasPreviousPage: false,
            assetsLoading: true,
            fundInvestors: [],
            fundInvestorsPage: 1,
            fundInvestorsSearch: '',
            fundInvestorsHasNextPage: false,
            fundInvestorsLoading: false,
            fundInvestorsLoadingMore: false,
            loading: true,
            error: null,
          },
        },
      };
    }),
    on(
      FundsApiActions.loadDetailSuccess,
      (state, { fundKey, detail, assets, assetsHasNextPage }) => {
        const fundAssets = extractPagedItems(assets);
        const entry: FundDetailCacheEntry = {
          detail,
          assets: [...fundAssets],
          assetsPage: 1,
          assetsHasNextPage,
          fundInvestors: [],
          fundInvestorsPage: 1,
          fundInvestorsHasNextPage: false,
        };
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              detail,
              assets: fundAssets,
              assetsPage: 1,
              assetsPageSize: LIST_PAGE_SIZE,
              assetsTotalCount: fundAssets.length,
              assetsTotalPages: assetsHasNextPage ? 2 : fundAssets.length ? 1 : 0,
              assetsSearch: '',
              assetsHasNextPage,
              assetsHasPreviousPage: false,
              assetsLoading: false,
              loading: false,
              error: null,
            },
            cache: {
              ...state.funds.cache,
              details: {
                ...state.funds.cache.details,
                [fundKey]: entry,
              },
            },
          },
        };
      },
    ),
    on(FundsApiActions.loadDetailFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          detail: null,
          assets: [],
          loading: false,
          assetsLoading: false,
          error,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPage, (state, { page, search, replace = true }) => {
      const sameRequestInFlight =
        replace &&
        page === 1 &&
        state.funds.detail.assetsSearch === search &&
        state.funds.detail.assetsLoading;
      if (sameRequestInFlight) {
        return state;
      }

      return {
        ...state,
        funds: {
          ...state.funds,
          detail: {
            ...state.funds.detail,
            assetsSearch: search,
            assetsLoading: replace,
            ...(replace
              ? {
                  assets: [],
                  assetsPage: page,
                  assetsTotalCount: 0,
                  assetsTotalPages: 0,
                  assetsHasNextPage: false,
                  assetsHasPreviousPage: false,
                }
              : {}),
          },
        },
      };
    }),
    on(
      FundsApiActions.loadFundAssetsPageSuccess,
      (state, { page, pageSize, totalCount, totalPages, items, hasNextPage, hasPreviousPage, replace }) => {
      const fundKey = state.funds.detail.selectedKey;
      const nextAssets = replace ? [...items] : [...state.funds.detail.assets, ...items];
      const nextDetail = {
        ...state.funds.detail,
        assetsPage: page,
        assetsPageSize: pageSize,
        assetsTotalCount: totalCount,
        assetsTotalPages: totalPages,
        assets: nextAssets,
        assetsHasNextPage: hasNextPage,
        assetsHasPreviousPage: hasPreviousPage,
        assetsLoading: false,
      };
      const nextCache = { ...state.funds.cache };
      if (fundKey != null) {
        const cachedFund = nextCache.details[fundKey];
        if (cachedFund) {
          nextCache.details = {
            ...nextCache.details,
            [fundKey]: {
              ...cachedFund,
              assets: [...nextAssets],
              assetsPage: page,
              assetsHasNextPage: hasNextPage,
            },
          };
        }
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: nextDetail,
          cache: nextCache,
        },
      };
    }),
    on(FundsApiActions.loadFundInvestorsPage, (state, { page, search }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          fundInvestorsSearch: search,
          fundInvestorsLoading: page === 1,
          fundInvestorsLoadingMore: page > 1,
        },
      },
    })),
    on(FundsApiActions.loadFundInvestorsPageSuccess, (state, { page, items, hasNextPage, append }) => {
      const fundKey = state.funds.detail.selectedKey;
      const nextInvestors = append ? [...state.funds.detail.fundInvestors, ...items] : [...items];
      const nextDetail = {
        ...state.funds.detail,
        fundInvestorsPage: page,
        fundInvestors: nextInvestors,
        fundInvestorsHasNextPage: hasNextPage,
        fundInvestorsLoading: false,
        fundInvestorsLoadingMore: false,
      };
      const nextCache = { ...state.funds.cache };
      if (fundKey != null) {
        const cachedFund = nextCache.details[fundKey];
        if (cachedFund) {
          nextCache.details = {
            ...nextCache.details,
            [fundKey]: {
              ...cachedFund,
              fundInvestors: [...nextInvestors],
              fundInvestorsPage: page,
              fundInvestorsHasNextPage: hasNextPage,
            },
          };
        }
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: nextDetail,
          cache: nextCache,
        },
      };
    }),
    on(FundsApiActions.loadFundInvestorsPageFailure, (state) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          fundInvestorsLoading: false,
          fundInvestorsLoadingMore: false,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPageFailure, (state) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          assetsLoading: false,
        },
      },
    })),
    on(FundsApiActions.loadFundPeriodsSuccess, (state, { fundKey, source, view, items }) => ({
      ...state,
      funds: {
        ...state.funds,
        cache: {
          ...state.funds.cache,
          periodLists: writeFundPeriodsCache(state.funds.cache.periodLists, fundKey, source, view, items),
        },
      },
    })),
    on(FundsApiActions.loadFundPeriodsFailure, (state) => state),
    on(
      FundsApiActions.loadFundCommitmentsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.funds.detail.selectedKey === fundKey &&
          state.funds.detail.commitmentsTimeframe === timeframe &&
          state.funds.detail.commitmentsSearch === search &&
          (state.funds.detail.commitmentsLoading || state.funds.detail.commitmentsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readFundCommitmentsPageCache(state.funds.cache.commitmentPages, fundKey, timeframe, page, dateKey);
        if (cached) {
          const nextCommitments = replace
            ? [...cached.items]
            : [...state.funds.detail.commitments, ...cached.items];
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                commitmentsTimeframe: timeframe,
                commitments: nextCommitments,
                commitmentsPage: page,
                commitmentsSearch: search,
                commitmentsHasNextPage: cached.hasNextPage,
                commitmentsLoading: false,
                commitmentsLoadingMore: false,
                commitmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              commitmentsTimeframe: timeframe,
              commitmentsSearch: search,
              commitmentsLoading: replace,
              commitmentsLoadingMore: !replace,
              commitmentsError: null,
              ...(replace ? { commitments: [], commitmentsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundCommitmentsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const fundKey = state.funds.detail.selectedKey;
        const nextCommitments = replace ? [...items] : [...state.funds.detail.commitments, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            commitmentPages: writeFundCommitmentsPageCache(
              nextCache.commitmentPages,
              fundKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              commitmentsTimeframe: timeframe,
              commitments: nextCommitments,
              commitmentsPage: page,
              commitmentsSearch: search,
              commitmentsHasNextPage: hasNextPage,
              commitmentsLoading: false,
              commitmentsLoadingMore: false,
              commitmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundCommitmentsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          commitmentsLoading: false,
          commitmentsLoadingMore: false,
          commitmentsError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundUnfundedCommitmentsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.funds.detail.selectedKey === fundKey &&
          state.funds.detail.unfundedCommitmentsTimeframe === timeframe &&
          state.funds.detail.unfundedCommitmentsSearch === search &&
          (state.funds.detail.unfundedCommitmentsLoading ||
            state.funds.detail.unfundedCommitmentsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readFundUnfundedCommitmentsPageCache(
            state.funds.cache.unfundedCommitmentPages,
            fundKey,
            timeframe,
            page,
            dateKey,
          );
        if (cached) {
          const nextRows = replace
            ? [...cached.items]
            : [...state.funds.detail.unfundedCommitments, ...cached.items];
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                unfundedCommitmentsTimeframe: timeframe,
                unfundedCommitments: nextRows,
                unfundedCommitmentsPage: page,
                unfundedCommitmentsSearch: search,
                unfundedCommitmentsHasNextPage: cached.hasNextPage,
                unfundedCommitmentsLoading: false,
                unfundedCommitmentsLoadingMore: false,
                unfundedCommitmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              unfundedCommitmentsTimeframe: timeframe,
              unfundedCommitmentsSearch: search,
              unfundedCommitmentsLoading: replace,
              unfundedCommitmentsLoadingMore: !replace,
              unfundedCommitmentsError: null,
              ...(replace ? { unfundedCommitments: [], unfundedCommitmentsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundUnfundedCommitmentsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const fundKey = state.funds.detail.selectedKey;
        const nextRows = replace
          ? [...items]
          : [...state.funds.detail.unfundedCommitments, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            unfundedCommitmentPages: writeFundUnfundedCommitmentsPageCache(
              nextCache.unfundedCommitmentPages,
              fundKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              unfundedCommitmentsTimeframe: timeframe,
              unfundedCommitments: nextRows,
              unfundedCommitmentsPage: page,
              unfundedCommitmentsSearch: search,
              unfundedCommitmentsHasNextPage: hasNextPage,
              unfundedCommitmentsLoading: false,
              unfundedCommitmentsLoadingMore: false,
              unfundedCommitmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundUnfundedCommitmentsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          unfundedCommitmentsLoading: false,
          unfundedCommitmentsLoadingMore: false,
          unfundedCommitmentsError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundInvestmentsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.funds.detail.selectedKey === fundKey &&
          state.funds.detail.fundInvestmentsTimeframe === timeframe &&
          state.funds.detail.fundInvestmentsSearch === search &&
          (state.funds.detail.fundInvestmentsLoading || state.funds.detail.fundInvestmentsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readFundInvestmentsPageCache(state.funds.cache.investmentPages, fundKey, timeframe, page, dateKey);
        if (cached) {
          const nextRows = replace
            ? [...cached.items]
            : [...state.funds.detail.fundInvestments, ...cached.items];
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                fundInvestmentsTimeframe: timeframe,
                fundInvestments: nextRows,
                fundInvestmentsPage: page,
                fundInvestmentsSearch: search,
                fundInvestmentsHasNextPage: cached.hasNextPage,
                fundInvestmentsLoading: false,
                fundInvestmentsLoadingMore: false,
                fundInvestmentsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              fundInvestmentsTimeframe: timeframe,
              fundInvestmentsSearch: search,
              fundInvestmentsLoading: replace,
              fundInvestmentsLoadingMore: !replace,
              fundInvestmentsError: null,
              ...(replace ? { fundInvestments: [], fundInvestmentsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundInvestmentsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const fundKey = state.funds.detail.selectedKey;
        const nextRows = replace ? [...items] : [...state.funds.detail.fundInvestments, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            investmentPages: writeFundInvestmentsPageCache(
              nextCache.investmentPages,
              fundKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              fundInvestmentsTimeframe: timeframe,
              fundInvestments: nextRows,
              fundInvestmentsPage: page,
              fundInvestmentsSearch: search,
              fundInvestmentsHasNextPage: hasNextPage,
              fundInvestmentsLoading: false,
              fundInvestmentsLoadingMore: false,
              fundInvestmentsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundInvestmentsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          fundInvestmentsLoading: false,
          fundInvestmentsLoadingMore: false,
          fundInvestmentsError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundDistributionsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey }) => {
        const sameRequestInFlight =
          replace &&
          page === 1 &&
          state.funds.detail.selectedKey === fundKey &&
          state.funds.detail.fundDistributionsTimeframe === timeframe &&
          state.funds.detail.fundDistributionsSearch === search &&
          (state.funds.detail.fundDistributionsLoading || state.funds.detail.fundDistributionsLoadingMore);
        if (sameRequestInFlight) {
          return state;
        }

        const cached =
          !search.trim() &&
          readFundDistributionsPageCache(
            state.funds.cache.distributionPages,
            fundKey,
            timeframe,
            page,
            dateKey,
          );
        if (cached) {
          const nextRows = replace
            ? [...cached.items]
            : [...state.funds.detail.fundDistributions, ...cached.items];
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                fundDistributionsTimeframe: timeframe,
                fundDistributions: nextRows,
                fundDistributionsPage: page,
                fundDistributionsSearch: search,
                fundDistributionsHasNextPage: cached.hasNextPage,
                fundDistributionsLoading: false,
                fundDistributionsLoadingMore: false,
                fundDistributionsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              fundDistributionsTimeframe: timeframe,
              fundDistributionsSearch: search,
              fundDistributionsLoading: replace,
              fundDistributionsLoadingMore: !replace,
              fundDistributionsError: null,
              ...(replace ? { fundDistributions: [], fundDistributionsHasNextPage: false } : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundDistributionsPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const fundKey = state.funds.detail.selectedKey;
        const nextRows = replace ? [...items] : [...state.funds.detail.fundDistributions, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            distributionPages: writeFundDistributionsPageCache(
              nextCache.distributionPages,
              fundKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              fundDistributionsTimeframe: timeframe,
              fundDistributions: nextRows,
              fundDistributionsPage: page,
              fundDistributionsSearch: search,
              fundDistributionsHasNextPage: hasNextPage,
              fundDistributionsLoading: false,
              fundDistributionsLoadingMore: false,
              fundDistributionsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundDistributionsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          fundDistributionsLoading: false,
          fundDistributionsLoadingMore: false,
          fundDistributionsError: error,
        },
      },
    })),
    on(FundsApiActions.loadFundNavPage, (state, { fundKey, timeframe, page, search, replace, dateKey }) => {
      const sameRequestInFlight =
        replace &&
        page === 1 &&
        state.funds.detail.selectedKey === fundKey &&
        state.funds.detail.navTimeframe === timeframe &&
        state.funds.detail.navSearch === search &&
        (state.funds.detail.navLoading || state.funds.detail.navLoadingMore);
      if (sameRequestInFlight) {
        return state;
      }

      const cached =
        !search.trim() && readFundNavPageCache(state.funds.cache.navPages, fundKey, timeframe, page, dateKey);
      if (cached) {
        const nextNav = replace ? [...cached.items] : [...state.funds.detail.nav, ...cached.items];
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              navTimeframe: timeframe,
              nav: nextNav,
              navPage: page,
              navSearch: search,
              navHasNextPage: cached.hasNextPage,
              navLoading: false,
              navLoadingMore: false,
              navError: null,
            },
          },
        };
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: {
            ...state.funds.detail,
            selectedKey: fundKey,
            navTimeframe: timeframe,
            navSearch: search,
            navLoading: replace,
            navLoadingMore: !replace,
            navError: null,
            ...(replace ? { nav: [], navHasNextPage: false } : {}),
          },
        },
      };
    }),
    on(
      FundsApiActions.loadFundNavPageSuccess,
      (state, { timeframe, page, items, hasNextPage, replace, search, dateKey }) => {
        const fundKey = state.funds.detail.selectedKey;
        const nextNav = replace ? [...items] : [...state.funds.detail.nav, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim()) {
          nextCache = {
            ...nextCache,
            navPages: writeFundNavPageCache(
              nextCache.navPages,
              fundKey,
              timeframe,
              page,
              items,
              hasNextPage,
              dateKey,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              navTimeframe: timeframe,
              nav: nextNav,
              navPage: page,
              navSearch: search,
              navHasNextPage: hasNextPage,
              navLoading: false,
              navLoadingMore: false,
              navError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundNavPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          navLoading: false,
          navLoadingMore: false,
          navError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundCapitalActivitiesPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey, calendarYear, investorName, sortBy }) => {
        const investor = investorName?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readFundCapitalActivitiesPageCache(
            state.funds.cache.capitalActivitiesPages,
            fundKey,
            timeframe,
            page,
            dateKey,
            investor,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                capitalActivitiesTimeframe: timeframe,
                capitalActivities: [...cached.items],
                capitalActivitiesPage: page,
                capitalActivitiesPageSize: cached.pageSize,
                capitalActivitiesTotalCount: cached.totalCount,
                capitalActivitiesTotalPages: cached.totalPages,
                capitalActivitiesSearch: search,
                capitalActivitiesInvestorName: investor,
                capitalActivitiesHasNextPage: cached.hasNextPage,
                capitalActivitiesHasPreviousPage: cached.hasPreviousPage,
                capitalActivitiesLoading: false,
                capitalActivitiesError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              capitalActivitiesTimeframe: timeframe,
              capitalActivitiesSearch: search,
              capitalActivitiesInvestorName: investor,
              capitalActivitiesLoading: replace,
              capitalActivitiesError: null,
              ...(replace
                ? {
                    capitalActivities: [],
                    capitalActivitiesPage: page,
                    capitalActivitiesTotalCount: 0,
                    capitalActivitiesTotalPages: 0,
                    capitalActivitiesHasNextPage: false,
                    capitalActivitiesHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundCapitalActivitiesPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          investorName,
          sortBy,
        },
      ) => {
        const fundKey = state.funds.detail.selectedKey;
        const investor = investorName?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.funds.detail.capitalActivities, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            capitalActivitiesPages: writeFundCapitalActivitiesPageCache(
              nextCache.capitalActivitiesPages,
              fundKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              investor,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              capitalActivitiesTimeframe: timeframe,
              capitalActivities: nextItems,
              capitalActivitiesPage: page,
              capitalActivitiesPageSize: pageSize,
              capitalActivitiesTotalCount: totalCount,
              capitalActivitiesTotalPages: totalPages,
              capitalActivitiesSearch: search,
              capitalActivitiesInvestorName: investor,
              capitalActivitiesHasNextPage: hasNextPage,
              capitalActivitiesHasPreviousPage: hasPreviousPage,
              capitalActivitiesLoading: false,
              capitalActivitiesError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundCapitalActivitiesPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          capitalActivitiesLoading: false,
          capitalActivitiesError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundDistributionTablePage,
      (state, { fundKey, timeframe, page, search, replace, dateKey, calendarYear, investorName, sortBy }) => {
        const investor = investorName?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readFundDistributionTablePageCache(
            state.funds.cache.distributionTablePages,
            fundKey,
            timeframe,
            page,
            dateKey,
            investor,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                distributionTableTimeframe: timeframe,
                distributionTable: [...cached.items],
                distributionTablePage: page,
                distributionTablePageSize: cached.pageSize,
                distributionTableTotalCount: cached.totalCount,
                distributionTableTotalPages: cached.totalPages,
                distributionTableSearch: search,
                distributionTableInvestorName: investor,
                distributionTableHasNextPage: cached.hasNextPage,
                distributionTableHasPreviousPage: cached.hasPreviousPage,
                distributionTableLoading: false,
                distributionTableError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              distributionTableTimeframe: timeframe,
              distributionTableSearch: search,
              distributionTableInvestorName: investor,
              distributionTableLoading: replace,
              distributionTableError: null,
              ...(replace
                ? {
                    distributionTable: [],
                    distributionTablePage: page,
                    distributionTableTotalCount: 0,
                    distributionTableTotalPages: 0,
                    distributionTableHasNextPage: false,
                    distributionTableHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundDistributionTablePageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          investorName,
          sortBy,
        },
      ) => {
        const fundKey = state.funds.detail.selectedKey;
        const investor = investorName?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.funds.detail.distributionTable, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            distributionTablePages: writeFundDistributionTablePageCache(
              nextCache.distributionTablePages,
              fundKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              investor,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              distributionTableTimeframe: timeframe,
              distributionTable: nextItems,
              distributionTablePage: page,
              distributionTablePageSize: pageSize,
              distributionTableTotalCount: totalCount,
              distributionTableTotalPages: totalPages,
              distributionTableSearch: search,
              distributionTableInvestorName: investor,
              distributionTableHasNextPage: hasNextPage,
              distributionTableHasPreviousPage: hasPreviousPage,
              distributionTableLoading: false,
              distributionTableError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundDistributionTablePageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          distributionTableLoading: false,
          distributionTableError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundIrrPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey, calendarYear, investorName, sortBy }) => {
      const investor = investorName?.trim() ?? '';

      const cached =
        !search.trim() &&
        !sortBy &&
        readFundIrrPageCache(state.funds.cache.irrPages, fundKey, timeframe, page, dateKey, investor, calendarYear);
      if (cached) {
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              irrTimeframe: timeframe,
              irr: [...cached.items],
              irrPage: page,
              irrPageSize: cached.pageSize,
              irrTotalCount: cached.totalCount,
              irrTotalPages: cached.totalPages,
              irrSearch: search,
              irrInvestorName: investor,
              irrHasNextPage: cached.hasNextPage,
              irrHasPreviousPage: cached.hasPreviousPage,
              irrLoading: false,
              irrError: null,
            },
          },
        };
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: {
            ...state.funds.detail,
            selectedKey: fundKey,
            irrTimeframe: timeframe,
            irrSearch: search,
            irrInvestorName: investor,
            irrLoading: replace,
            irrError: null,
            ...(replace
              ? {
                  irr: [],
                  irrPage: page,
                  irrTotalCount: 0,
                  irrTotalPages: 0,
                  irrHasNextPage: false,
                  irrHasPreviousPage: false,
                }
              : {}),
          },
        },
      };
    }),
    on(
      FundsApiActions.loadFundIrrPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          investorName,
          sortBy,
        },
      ) => {
        const fundKey = state.funds.detail.selectedKey;
        const investor = investorName?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.funds.detail.irr, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            irrPages: writeFundIrrPageCache(
              nextCache.irrPages,
              fundKey,
              timeframe,
              page,
              items,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              investor,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              irrTimeframe: timeframe,
              irr: nextItems,
              irrPage: page,
              irrPageSize: pageSize,
              irrTotalCount: totalCount,
              irrTotalPages: totalPages,
              irrSearch: search,
              irrInvestorName: investor,
              irrHasNextPage: hasNextPage,
              irrHasPreviousPage: hasPreviousPage,
              irrLoading: false,
              irrError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundIrrPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          irrLoading: false,
          irrError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundCapitalObligationsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey, calendarYear, investorName, sortBy }) => {
        const investor = investorName?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readFundCapitalObligationsPageCache(
            state.funds.cache.capitalObligationsPages,
            fundKey,
            timeframe,
            page,
            dateKey,
            investor,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                capitalObligationsTimeframe: timeframe,
                capitalObligations: [...cached.items],
                capitalObligationsPage: page,
                capitalObligationsPageSize: cached.pageSize,
                capitalObligationsTotalCount: cached.totalCount,
                capitalObligationsTotalPages: cached.totalPages,
                capitalObligationsSearch: search,
                capitalObligationsInvestorName: investor,
                capitalObligationsHasNextPage: cached.hasNextPage,
                capitalObligationsHasPreviousPage: cached.hasPreviousPage,
                capitalObligationsLoading: false,
                capitalObligationsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              capitalObligationsTimeframe: timeframe,
              capitalObligationsSearch: search,
              capitalObligationsInvestorName: investor,
              capitalObligationsLoading: replace,
              capitalObligationsError: null,
              ...(replace
                ? {
                    capitalObligations: [],
                    capitalObligationsPage: page,
                    capitalObligationsTotalCount: 0,
                    capitalObligationsTotalPages: 0,
                    capitalObligationsHasNextPage: false,
                    capitalObligationsHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundCapitalObligationsPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          investorName,
          sortBy,
        },
      ) => {
        const fundKey = state.funds.detail.selectedKey;
        const investor = investorName?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.funds.detail.capitalObligations, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            capitalObligationsPages: writeFundCapitalObligationsPageCache(
              nextCache.capitalObligationsPages,
              fundKey,
              timeframe,
              page,
              nextItems,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              investor,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              capitalObligationsTimeframe: timeframe,
              capitalObligations: nextItems,
              capitalObligationsPage: page,
              capitalObligationsPageSize: pageSize,
              capitalObligationsTotalCount: totalCount,
              capitalObligationsTotalPages: totalPages,
              capitalObligationsSearch: search,
              capitalObligationsInvestorName: investor,
              capitalObligationsHasNextPage: hasNextPage,
              capitalObligationsHasPreviousPage: hasPreviousPage,
              capitalObligationsLoading: false,
              capitalObligationsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundCapitalObligationsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          capitalObligationsLoading: false,
          capitalObligationsError: error,
        },
      },
    })),
    on(
      FundsApiActions.loadFundNetAssetsPage,
      (state, { fundKey, timeframe, page, search, replace, dateKey, calendarYear, investorName, sortBy }) => {
        const investor = investorName?.trim() ?? '';

        const cached =
          !search.trim() &&
          !sortBy &&
          readFundNetAssetsPageCache(
            state.funds.cache.netAssetsPages,
            fundKey,
            timeframe,
            page,
            dateKey,
            investor,
            calendarYear,
          );
        if (cached) {
          return {
            ...state,
            funds: {
              ...state.funds,
              detail: {
                ...state.funds.detail,
                selectedKey: fundKey,
                netAssetsTimeframe: timeframe,
                netAssets: [...cached.items],
                netAssetsPage: page,
                netAssetsPageSize: cached.pageSize,
                netAssetsTotalCount: cached.totalCount,
                netAssetsTotalPages: cached.totalPages,
                netAssetsSearch: search,
                netAssetsInvestorName: investor,
                netAssetsHasNextPage: cached.hasNextPage,
                netAssetsHasPreviousPage: cached.hasPreviousPage,
                netAssetsLoading: false,
                netAssetsError: null,
              },
            },
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              selectedKey: fundKey,
              netAssetsTimeframe: timeframe,
              netAssetsSearch: search,
              netAssetsInvestorName: investor,
              netAssetsLoading: replace,
              netAssetsError: null,
              ...(replace
                ? {
                    netAssets: [],
                    netAssetsPage: page,
                    netAssetsTotalCount: 0,
                    netAssetsTotalPages: 0,
                    netAssetsHasNextPage: false,
                    netAssetsHasPreviousPage: false,
                  }
                : {}),
            },
          },
        };
      },
    ),
    on(
      FundsApiActions.loadFundNetAssetsPageSuccess,
      (
        state,
        {
          timeframe,
          page,
          pageSize,
          totalCount,
          totalPages,
          items,
          hasNextPage,
          hasPreviousPage,
          replace,
          search,
          dateKey,
          calendarYear,
          investorName,
          sortBy,
        },
      ) => {
        const fundKey = state.funds.detail.selectedKey;
        const investor = investorName?.trim() ?? '';
        const nextItems = replace ? [...items] : [...state.funds.detail.netAssets, ...items];
        let nextCache = state.funds.cache;
        if (fundKey != null && !search.trim() && !sortBy) {
          nextCache = {
            ...nextCache,
            netAssetsPages: writeFundNetAssetsPageCache(
              nextCache.netAssetsPages,
              fundKey,
              timeframe,
              page,
              nextItems,
              pageSize,
              totalCount,
              totalPages,
              hasNextPage,
              hasPreviousPage,
              dateKey,
              investor,
              calendarYear,
            ),
          };
        }
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...state.funds.detail,
              netAssetsTimeframe: timeframe,
              netAssets: nextItems,
              netAssetsPage: page,
              netAssetsPageSize: pageSize,
              netAssetsTotalCount: totalCount,
              netAssetsTotalPages: totalPages,
              netAssetsSearch: search,
              netAssetsInvestorName: investor,
              netAssetsHasNextPage: hasNextPage,
              netAssetsHasPreviousPage: hasPreviousPage,
              netAssetsLoading: false,
              netAssetsError: null,
            },
            cache: nextCache,
          },
        };
      },
    ),
    on(FundsApiActions.loadFundNetAssetsPageFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          netAssetsLoading: false,
          netAssetsError: error,
        },
      },
    })),
    on(FundsApiActions.clearDetail, (state) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: initialCapitalDashboardState.funds.detail,
      },
    })),

    // Assets list
    on(AssetsApiActions.loadList, (state, { search, page, replace, cacheKey }) => {
      const scope = cacheKey ?? '';
      const cached = readAssetsListCacheEntry(state.assets.cache.lists, search, page, scope);
      if (cached) {
        const list = assetsListStateFromCacheEntry(search, cached, scope);
        return {
          ...state,
          assets: {
            ...state.assets,
            list: replace ? list : applyAssetsPagedList(state.assets.list, cached, false),
          },
        };
      }
      return {
        ...state,
        assets: {
          ...state.assets,
          list: assetsListLoadingState(state.assets.list, search, replace, scope),
        },
      };
    }),
    on(AssetsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.assets.list.search;
      const scope = state.assets.list.listScope;
      const page = result.page ?? state.assets.list.page;
      return {
        ...state,
        assets: {
          ...state.assets,
          list: applyAssetsPagedList(state.assets.list, result, replace),
          cache: {
            ...state.assets.cache,
            lists: writeAssetsListCacheEntry(state.assets.cache.lists, search, result, page, scope),
          },
        },
      };
    }),
    on(AssetsApiActions.loadListFailure, (state, { error }) => ({
      ...state,
      assets: {
        ...state.assets,
        list: {
          ...state.assets.list,
          loading: false,
          loadingMore: false,
          error,
        },
      },
    })),

    // Assets detail
    on(AssetsApiActions.loadDetail, (state, { propertyKey }) => {
      const cached = state.assets.cache.details[propertyKey];
      if (cached) {
        return {
          ...state,
          assets: {
            ...state.assets,
            detail: {
              selectedKey: propertyKey,
              detail: cached.detail,
              leasingSummary: cached.leasingSummary,
              loading: false,
              error: null,
            },
          },
        };
      }
      return {
        ...state,
        assets: {
          ...state.assets,
          detail: {
            selectedKey: propertyKey,
            detail: null,
            leasingSummary: null,
            loading: true,
            error: null,
          },
        },
      };
    }),
    on(AssetsApiActions.loadDetailSuccess, (state, { propertyKey, detail, leasingSummary }) => ({
      ...state,
      assets: {
        ...state.assets,
        detail: {
          selectedKey: propertyKey,
          detail,
          leasingSummary,
          loading: false,
          error: null,
        },
        cache: {
          ...state.assets.cache,
          details: {
            ...state.assets.cache.details,
            [propertyKey]: { detail, leasingSummary },
          },
        },
      },
    })),
    on(AssetsApiActions.loadDetailFailure, (state, { error }) => ({
      ...state,
      assets: {
        ...state.assets,
        detail: {
          ...state.assets.detail,
          detail: null,
          leasingSummary: null,
          loading: false,
          error,
        },
      },
    })),
    on(AssetsApiActions.clearDetail, (state) => ({
      ...state,
      assets: {
        ...state.assets,
        detail: initialCapitalDashboardState.assets.detail,
      },
    })),
  ),
});

export const {
  name: capitalDashboardFeatureKey,
  reducer: capitalDashboardReducer,
  selectCapitalDashboardState,
  selectActiveTab,
  selectInvestors,
  selectFunds,
  selectAssets,
} = capitalDashboardFeature;

export type { CapitalDashboardState };
