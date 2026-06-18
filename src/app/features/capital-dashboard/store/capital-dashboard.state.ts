import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundAssetTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundInvestorCapitalActivityTabRow,
  FundInvestorDistributionTableTabRow,
  FundInvestorIrrTabRow,
  FundInvestorCapitalObligationTabRow,
  FundInvestorNetAssetTabRow,
  FundListItemDto,
  InvestorCapitalActivityTabRow,
  InvestorCapitalObligationTabRow,
  InvestorNetAssetTabRow,
  InvestorDetailDto,
  InvestorDistributionTableTabRow,
  InvestorFundHoldingTabRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
  InvestorListItemDto,
  InvestorUnderlyingInvestmentTabRow,
  InvestorsListSummaryDto,
  FundsListSummaryDto,
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
  AssetsListSummaryDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundInvestorTabRow } from '../shared/mappers/fund-investor.mapper';
import {
  AssetDetailCacheEntry,
  FundAssetsPageCacheEntry,
  FundAmountPageCacheEntry,
  FundCommitmentsPageCacheEntry,
  FundDistributionsPageCacheEntry,
  FundInvestorsPageCacheEntry,
  FundNavPageCacheEntry,
  FundCapitalActivitiesPageCacheEntry,
  FundDistributionTablePageCacheEntry,
  FundIrrPageCacheEntry,
  FundCapitalObligationsPageCacheEntry,
  FundNetAssetsPageCacheEntry,
  FundPeriodsCacheEntry,
  FundDetailCacheEntry,
  InvestorDetailCacheEntry,
  InvestorFundsPageCacheEntry,
  InvestorAmountPageCacheEntry,
  InvestorCapitalInvestmentsPageCacheEntry,
  InvestorDistributionsPageCacheEntry,
  InvestorNavPageCacheEntry,
  InvestorCapitalActivitiesPageCacheEntry,
  InvestorDistributionTablePageCacheEntry,
  InvestorIrrPageCacheEntry,
  InvestorCapitalObligationsPageCacheEntry,
  InvestorNetAssetsPageCacheEntry,
  InvestorFundHoldingsCacheEntry,
  InvestorPeriodsCacheEntry,
  ListCacheEntry,
} from './capital-dashboard-cache.util';
import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';

export type CapitalDashboardTab = 'dashboard' | 'investor' | 'investment' | 'asset';

export interface PagedListState<T> {
  items: T[];
  search: string;
  page: number;
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  listScope: string;
}

export interface InvestorsPagedListState extends PagedListState<InvestorListItemDto> {
  summary: InvestorsListSummaryDto | null;
}

export interface FundsPagedListState extends PagedListState<FundListItemDto> {
  summary: FundsListSummaryDto | null;
}

export interface InvestorsDetailState {
  selectedKey: number | null;
  detail: InvestorDetailDto | null;
  /** Funds tab rows from `/funds`. */
  investments: InvestorInvestmentDto[];
  investmentsPage: number;
  investmentsSearch: string;
  investmentsHasNextPage: boolean;
  investmentsLoading: boolean;
  investmentsLoadingMore: boolean;
  commitmentsTimeframe: FundCommitmentTimeframe;
  commitments: FundAmountTabRow[];
  commitmentsPage: number;
  commitmentsSearch: string;
  commitmentsHasNextPage: boolean;
  commitmentsLoading: boolean;
  commitmentsLoadingMore: boolean;
  commitmentsError: string | null;
  unfundedCommitmentsTimeframe: FundCommitmentTimeframe;
  unfundedCommitments: FundAmountTabRow[];
  unfundedCommitmentsPage: number;
  unfundedCommitmentsSearch: string;
  unfundedCommitmentsHasNextPage: boolean;
  unfundedCommitmentsLoading: boolean;
  unfundedCommitmentsLoadingMore: boolean;
  unfundedCommitmentsError: string | null;
  capitalInvestments: InvestorUnderlyingInvestmentTabRow[];
  capitalInvestmentsPage: number;
  capitalInvestmentsPageSize: number;
  capitalInvestmentsTotalCount: number;
  capitalInvestmentsTotalPages: number;
  capitalInvestmentsHasNextPage: boolean;
  capitalInvestmentsHasPreviousPage: boolean;
  capitalInvestmentsLoading: boolean;
  capitalInvestmentsError: string | null;
  investorDistributionsTimeframe: FundCommitmentTimeframe;
  investorDistributions: FundDistributionGroupTabRow[];
  investorDistributionsPage: number;
  investorDistributionsSearch: string;
  investorDistributionsHasNextPage: boolean;
  investorDistributionsLoading: boolean;
  investorDistributionsLoadingMore: boolean;
  investorDistributionsError: string | null;
  navTimeframe: FundNavTimeframe;
  nav: FundNavTabRow[];
  navPage: number;
  navSearch: string;
  navHasNextPage: boolean;
  navLoading: boolean;
  navLoadingMore: boolean;
  navError: string | null;
  capitalActivitiesTimeframe: FundCommitmentTimeframe;
  capitalActivities: InvestorCapitalActivityTabRow[];
  capitalActivitiesPage: number;
  capitalActivitiesPageSize: number;
  capitalActivitiesTotalCount: number;
  capitalActivitiesTotalPages: number;
  capitalActivitiesSearch: string;
  capitalActivitiesFundCode: string;
  capitalActivitiesHasNextPage: boolean;
  capitalActivitiesHasPreviousPage: boolean;
  capitalActivitiesLoading: boolean;
  capitalActivitiesError: string | null;
  distributionTableTimeframe: FundCommitmentTimeframe;
  distributionTable: InvestorDistributionTableTabRow[];
  distributionTablePage: number;
  distributionTablePageSize: number;
  distributionTableTotalCount: number;
  distributionTableTotalPages: number;
  distributionTableSearch: string;
  distributionTableFundCode: string;
  distributionTableHasNextPage: boolean;
  distributionTableHasPreviousPage: boolean;
  distributionTableLoading: boolean;
  distributionTableError: string | null;
  irrTimeframe: FundCommitmentTimeframe;
  irr: InvestorIrrTabRow[];
  irrPage: number;
  irrPageSize: number;
  irrTotalCount: number;
  irrTotalPages: number;
  irrSearch: string;
  irrFundCode: string;
  irrHasNextPage: boolean;
  irrHasPreviousPage: boolean;
  irrLoading: boolean;
  irrError: string | null;
  capitalObligationsTimeframe: FundCommitmentTimeframe;
  capitalObligations: InvestorCapitalObligationTabRow[];
  capitalObligationsPage: number;
  capitalObligationsPageSize: number;
  capitalObligationsTotalCount: number;
  capitalObligationsTotalPages: number;
  capitalObligationsSearch: string;
  capitalObligationsFundCode: string;
  capitalObligationsHasNextPage: boolean;
  capitalObligationsHasPreviousPage: boolean;
  capitalObligationsLoading: boolean;
  capitalObligationsError: string | null;
  netAssetsTimeframe: FundCommitmentTimeframe;
  netAssets: InvestorNetAssetTabRow[];
  netAssetsPage: number;
  netAssetsPageSize: number;
  netAssetsTotalCount: number;
  netAssetsTotalPages: number;
  netAssetsSearch: string;
  netAssetsFundCode: string;
  netAssetsHasNextPage: boolean;
  netAssetsHasPreviousPage: boolean;
  netAssetsLoading: boolean;
  netAssetsError: string | null;
  fundHoldings: InvestorFundHoldingTabRow[];
  fundHoldingsDateKey: number | null;
  fundHoldingsLoading: boolean;
  fundHoldingsError: string | null;
  loading: boolean;
  error: string | null;
}

export interface FundsDetailState {
  selectedKey: number | null;
  detail: FundDetailDto | null;
  assets: FundAssetTabRow[];
  assetsPage: number;
  assetsPageSize: number;
  assetsTotalCount: number;
  assetsTotalPages: number;
  assetsSearch: string;
  assetsHasNextPage: boolean;
  assetsHasPreviousPage: boolean;
  assetsLoading: boolean;
  fundInvestors: FundInvestorTabRow[];
  fundInvestorsPage: number;
  fundInvestorsSearch: string;
  fundInvestorsHasNextPage: boolean;
  fundInvestorsLoading: boolean;
  fundInvestorsLoadingMore: boolean;
  commitmentsTimeframe: FundCommitmentTimeframe;
  commitments: FundAmountTabRow[];
  commitmentsPage: number;
  commitmentsSearch: string;
  commitmentsHasNextPage: boolean;
  commitmentsLoading: boolean;
  commitmentsLoadingMore: boolean;
  commitmentsError: string | null;
  unfundedCommitmentsTimeframe: FundCommitmentTimeframe;
  unfundedCommitments: FundAmountTabRow[];
  unfundedCommitmentsPage: number;
  unfundedCommitmentsSearch: string;
  unfundedCommitmentsHasNextPage: boolean;
  unfundedCommitmentsLoading: boolean;
  unfundedCommitmentsLoadingMore: boolean;
  unfundedCommitmentsError: string | null;
  fundInvestmentsTimeframe: FundCommitmentTimeframe;
  fundInvestments: FundCommitmentTabRow[];
  fundInvestmentsPage: number;
  fundInvestmentsSearch: string;
  fundInvestmentsHasNextPage: boolean;
  fundInvestmentsLoading: boolean;
  fundInvestmentsLoadingMore: boolean;
  fundInvestmentsError: string | null;
  fundDistributionsTimeframe: FundCommitmentTimeframe;
  fundDistributions: FundDistributionGroupTabRow[];
  fundDistributionsPage: number;
  fundDistributionsSearch: string;
  fundDistributionsHasNextPage: boolean;
  fundDistributionsLoading: boolean;
  fundDistributionsLoadingMore: boolean;
  fundDistributionsError: string | null;
  navTimeframe: FundNavTimeframe;
  nav: FundNavTabRow[];
  navPage: number;
  navSearch: string;
  navHasNextPage: boolean;
  navLoading: boolean;
  navLoadingMore: boolean;
  navError: string | null;
  capitalActivitiesTimeframe: FundCommitmentTimeframe;
  capitalActivities: FundInvestorCapitalActivityTabRow[];
  capitalActivitiesPage: number;
  capitalActivitiesPageSize: number;
  capitalActivitiesTotalCount: number;
  capitalActivitiesTotalPages: number;
  capitalActivitiesSearch: string;
  capitalActivitiesInvestorName: string;
  capitalActivitiesHasNextPage: boolean;
  capitalActivitiesHasPreviousPage: boolean;
  capitalActivitiesLoading: boolean;
  capitalActivitiesError: string | null;
  distributionTableTimeframe: FundCommitmentTimeframe;
  distributionTable: FundInvestorDistributionTableTabRow[];
  distributionTablePage: number;
  distributionTablePageSize: number;
  distributionTableTotalCount: number;
  distributionTableTotalPages: number;
  distributionTableSearch: string;
  distributionTableInvestorName: string;
  distributionTableHasNextPage: boolean;
  distributionTableHasPreviousPage: boolean;
  distributionTableLoading: boolean;
  distributionTableError: string | null;
  irrTimeframe: FundCommitmentTimeframe;
  irr: FundInvestorIrrTabRow[];
  irrPage: number;
  irrPageSize: number;
  irrTotalCount: number;
  irrTotalPages: number;
  irrSearch: string;
  irrInvestorName: string;
  irrHasNextPage: boolean;
  irrHasPreviousPage: boolean;
  irrLoading: boolean;
  irrError: string | null;
  capitalObligationsTimeframe: FundCommitmentTimeframe;
  capitalObligations: FundInvestorCapitalObligationTabRow[];
  capitalObligationsPage: number;
  capitalObligationsPageSize: number;
  capitalObligationsTotalCount: number;
  capitalObligationsTotalPages: number;
  capitalObligationsSearch: string;
  capitalObligationsInvestorName: string;
  capitalObligationsHasNextPage: boolean;
  capitalObligationsHasPreviousPage: boolean;
  capitalObligationsLoading: boolean;
  capitalObligationsError: string | null;
  netAssetsTimeframe: FundCommitmentTimeframe;
  netAssets: FundInvestorNetAssetTabRow[];
  netAssetsPage: number;
  netAssetsPageSize: number;
  netAssetsTotalCount: number;
  netAssetsTotalPages: number;
  netAssetsSearch: string;
  netAssetsInvestorName: string;
  netAssetsHasNextPage: boolean;
  netAssetsHasPreviousPage: boolean;
  netAssetsLoading: boolean;
  netAssetsError: string | null;
  loading: boolean;
  error: string | null;
}

export interface AssetsDetailState {
  selectedKey: number | null;
  detail: PropertyDetailDto | null;
  leasingSummary: PropertyLeasingSummaryDto | null;
  loading: boolean;
  error: string | null;
}

export interface InvestorsListCacheEntry extends ListCacheEntry<InvestorListItemDto> {
  summary: InvestorsListSummaryDto | null;
}

export interface InvestorsCacheState {
  lists: Record<string, InvestorsListCacheEntry>;
  details: Record<number, InvestorDetailCacheEntry>;
  fundsPages: Record<string, InvestorFundsPageCacheEntry>;
  periodLists: Record<string, InvestorPeriodsCacheEntry>;
  commitmentPages: Record<string, InvestorAmountPageCacheEntry>;
  unfundedCommitmentPages: Record<string, InvestorAmountPageCacheEntry>;
  capitalInvestmentPages: Record<string, InvestorCapitalInvestmentsPageCacheEntry>;
  distributionPages: Record<string, InvestorDistributionsPageCacheEntry>;
  navPages: Record<string, InvestorNavPageCacheEntry>;
  capitalActivitiesPages: Record<string, InvestorCapitalActivitiesPageCacheEntry>;
  distributionTablePages: Record<string, InvestorDistributionTablePageCacheEntry>;
  irrPages: Record<string, InvestorIrrPageCacheEntry>;
  capitalObligationsPages: Record<string, InvestorCapitalObligationsPageCacheEntry>;
  netAssetsPages: Record<string, InvestorNetAssetsPageCacheEntry>;
  fundHoldingsPages: Record<string, InvestorFundHoldingsCacheEntry>;
}

export interface FundsListCacheEntry extends ListCacheEntry<FundListItemDto> {
  summary: FundsListSummaryDto | null;
}

export interface FundsCacheState {
  lists: Record<string, FundsListCacheEntry>;
  details: Record<number, FundDetailCacheEntry>;
  assetPages: Record<string, FundAssetsPageCacheEntry>;
  periodLists: Record<string, FundPeriodsCacheEntry>;
  commitmentPages: Record<string, FundAmountPageCacheEntry>;
  unfundedCommitmentPages: Record<string, FundAmountPageCacheEntry>;
  investmentPages: Record<string, FundCommitmentsPageCacheEntry>;
  distributionPages: Record<string, FundDistributionsPageCacheEntry>;
  investorPages: Record<string, FundInvestorsPageCacheEntry>;
  navPages: Record<string, FundNavPageCacheEntry>;
  capitalActivitiesPages: Record<string, FundCapitalActivitiesPageCacheEntry>;
  distributionTablePages: Record<string, FundDistributionTablePageCacheEntry>;
  irrPages: Record<string, FundIrrPageCacheEntry>;
  capitalObligationsPages: Record<string, FundCapitalObligationsPageCacheEntry>;
  netAssetsPages: Record<string, FundNetAssetsPageCacheEntry>;
}

export interface AssetsListCacheEntry extends ListCacheEntry<PropertyListItemDto> {
  summary: AssetsListSummaryDto | null;
}

export interface AssetsPagedListState extends PagedListState<PropertyListItemDto> {
  summary: AssetsListSummaryDto | null;
}

export interface AssetsCacheState {
  lists: Record<string, AssetsListCacheEntry>;
  details: Record<number, AssetDetailCacheEntry>;
}

export interface CapitalDashboardState {
  activeTab: CapitalDashboardTab;
  investors: {
    list: InvestorsPagedListState;
    detail: InvestorsDetailState;
    cache: InvestorsCacheState;
  };
  funds: {
    list: FundsPagedListState;
    detail: FundsDetailState;
    cache: FundsCacheState;
  };
  assets: {
    list: AssetsPagedListState;
    detail: AssetsDetailState;
    cache: AssetsCacheState;
  };
}

function emptyListState<T>(): PagedListState<T> {
  return {
    items: [],
    search: '',
    page: 1,
    totalCount: 0,
    hasNextPage: false,
    loading: true,
    loadingMore: false,
    error: null,
    listScope: '',
  };
}

function emptyInvestorsListState(): InvestorsPagedListState {
  return {
    ...emptyListState<InvestorListItemDto>(),
    summary: null,
  };
}

function emptyFundsListState(): FundsPagedListState {
  return {
    ...emptyListState<FundListItemDto>(),
    summary: null,
  };
}

function emptyAssetsListState(): AssetsPagedListState {
  return {
    ...emptyListState<PropertyListItemDto>(),
    summary: null,
  };
}

function emptyInvestorsDetail(): InvestorsDetailState {
  const fundsDetail = emptyFundsDetail();
  return {
    selectedKey: null,
    detail: null,
    investments: [],
    investmentsPage: 1,
    investmentsSearch: '',
    investmentsHasNextPage: false,
    investmentsLoading: false,
    investmentsLoadingMore: false,
    commitmentsTimeframe: fundsDetail.commitmentsTimeframe,
    commitments: [],
    commitmentsPage: 1,
    commitmentsSearch: '',
    commitmentsHasNextPage: false,
    commitmentsLoading: false,
    commitmentsLoadingMore: false,
    commitmentsError: null,
    unfundedCommitmentsTimeframe: fundsDetail.unfundedCommitmentsTimeframe,
    unfundedCommitments: [],
    unfundedCommitmentsPage: 1,
    unfundedCommitmentsSearch: '',
    unfundedCommitmentsHasNextPage: false,
    unfundedCommitmentsLoading: false,
    unfundedCommitmentsLoadingMore: false,
    unfundedCommitmentsError: null,
    capitalInvestments: [],
    capitalInvestmentsPage: 1,
    capitalInvestmentsPageSize: LIST_PAGE_SIZE,
    capitalInvestmentsTotalCount: 0,
    capitalInvestmentsTotalPages: 0,
    capitalInvestmentsHasNextPage: false,
    capitalInvestmentsHasPreviousPage: false,
    capitalInvestmentsLoading: false,
    capitalInvestmentsError: null,
    investorDistributionsTimeframe: fundsDetail.fundDistributionsTimeframe,
    investorDistributions: [],
    investorDistributionsPage: 1,
    investorDistributionsSearch: '',
    investorDistributionsHasNextPage: false,
    investorDistributionsLoading: false,
    investorDistributionsLoadingMore: false,
    investorDistributionsError: null,
    navTimeframe: fundsDetail.navTimeframe,
    nav: [],
    navPage: 1,
    navSearch: '',
    navHasNextPage: false,
    navLoading: false,
    navLoadingMore: false,
    navError: null,
    capitalActivitiesTimeframe: fundsDetail.navTimeframe,
    capitalActivities: [],
    capitalActivitiesPage: 1,
    capitalActivitiesPageSize: LIST_PAGE_SIZE,
    capitalActivitiesTotalCount: 0,
    capitalActivitiesTotalPages: 0,
    capitalActivitiesSearch: '',
    capitalActivitiesFundCode: '',
    capitalActivitiesHasNextPage: false,
    capitalActivitiesHasPreviousPage: false,
    capitalActivitiesLoading: false,
    capitalActivitiesError: null,
    distributionTableTimeframe: fundsDetail.navTimeframe,
    distributionTable: [],
    distributionTablePage: 1,
    distributionTablePageSize: LIST_PAGE_SIZE,
    distributionTableTotalCount: 0,
    distributionTableTotalPages: 0,
    distributionTableSearch: '',
    distributionTableFundCode: '',
    distributionTableHasNextPage: false,
    distributionTableHasPreviousPage: false,
    distributionTableLoading: false,
    distributionTableError: null,
    irrTimeframe: fundsDetail.navTimeframe,
    irr: [],
    irrPage: 1,
    irrPageSize: LIST_PAGE_SIZE,
    irrTotalCount: 0,
    irrTotalPages: 0,
    irrSearch: '',
    irrFundCode: '',
    irrHasNextPage: false,
    irrHasPreviousPage: false,
    irrLoading: false,
    irrError: null,
    capitalObligationsTimeframe: fundsDetail.navTimeframe,
    capitalObligations: [],
    capitalObligationsPage: 1,
    capitalObligationsPageSize: LIST_PAGE_SIZE,
    capitalObligationsTotalCount: 0,
    capitalObligationsTotalPages: 0,
    capitalObligationsSearch: '',
    capitalObligationsFundCode: '',
    capitalObligationsHasNextPage: false,
    capitalObligationsHasPreviousPage: false,
    capitalObligationsLoading: false,
    capitalObligationsError: null,
    netAssetsTimeframe: fundsDetail.navTimeframe,
    netAssets: [],
    netAssetsPage: 1,
    netAssetsPageSize: LIST_PAGE_SIZE,
    netAssetsTotalCount: 0,
    netAssetsTotalPages: 0,
    netAssetsSearch: '',
    netAssetsFundCode: '',
    netAssetsHasNextPage: false,
    netAssetsHasPreviousPage: false,
    netAssetsLoading: false,
    netAssetsError: null,
    fundHoldings: [],
    fundHoldingsDateKey: null,
    fundHoldingsLoading: false,
    fundHoldingsError: null,
    loading: false,
    error: null,
  };
}

function emptyFundsDetail(): FundsDetailState {
  return {
    selectedKey: null,
    detail: null,
    assets: [],
    assetsPage: 1,
    assetsPageSize: LIST_PAGE_SIZE,
    assetsTotalCount: 0,
    assetsTotalPages: 0,
    assetsSearch: '',
    assetsHasNextPage: false,
    assetsHasPreviousPage: false,
    assetsLoading: false,
    fundInvestors: [],
    fundInvestorsPage: 1,
    fundInvestorsSearch: '',
    fundInvestorsHasNextPage: false,
    fundInvestorsLoading: false,
    fundInvestorsLoadingMore: false,
    commitmentsTimeframe: 'ltd',
    commitments: [],
    commitmentsPage: 1,
    commitmentsSearch: '',
    commitmentsHasNextPage: false,
    commitmentsLoading: false,
    commitmentsLoadingMore: false,
    commitmentsError: null,
    unfundedCommitmentsTimeframe: 'ltd',
    unfundedCommitments: [],
    unfundedCommitmentsPage: 1,
    unfundedCommitmentsSearch: '',
    unfundedCommitmentsHasNextPage: false,
    unfundedCommitmentsLoading: false,
    unfundedCommitmentsLoadingMore: false,
    unfundedCommitmentsError: null,
    fundInvestmentsTimeframe: 'ltd',
    fundInvestments: [],
    fundInvestmentsPage: 1,
    fundInvestmentsSearch: '',
    fundInvestmentsHasNextPage: false,
    fundInvestmentsLoading: false,
    fundInvestmentsLoadingMore: false,
    fundInvestmentsError: null,
    fundDistributionsTimeframe: 'ltd',
    fundDistributions: [],
    fundDistributionsPage: 1,
    fundDistributionsSearch: '',
    fundDistributionsHasNextPage: false,
    fundDistributionsLoading: false,
    fundDistributionsLoadingMore: false,
    fundDistributionsError: null,
    navTimeframe: 'ltd',
    nav: [],
    navPage: 1,
    navSearch: '',
    navHasNextPage: false,
    navLoading: false,
    navLoadingMore: false,
    navError: null,
    capitalActivitiesTimeframe: 'ltd',
    capitalActivities: [],
    capitalActivitiesPage: 1,
    capitalActivitiesPageSize: LIST_PAGE_SIZE,
    capitalActivitiesTotalCount: 0,
    capitalActivitiesTotalPages: 0,
    capitalActivitiesSearch: '',
    capitalActivitiesInvestorName: '',
    capitalActivitiesHasNextPage: false,
    capitalActivitiesHasPreviousPage: false,
    capitalActivitiesLoading: false,
    capitalActivitiesError: null,
    distributionTableTimeframe: 'ltd',
    distributionTable: [],
    distributionTablePage: 1,
    distributionTablePageSize: LIST_PAGE_SIZE,
    distributionTableTotalCount: 0,
    distributionTableTotalPages: 0,
    distributionTableSearch: '',
    distributionTableInvestorName: '',
    distributionTableHasNextPage: false,
    distributionTableHasPreviousPage: false,
    distributionTableLoading: false,
    distributionTableError: null,
    irrTimeframe: 'ltd',
    irr: [],
    irrPage: 1,
    irrPageSize: LIST_PAGE_SIZE,
    irrTotalCount: 0,
    irrTotalPages: 0,
    irrSearch: '',
    irrInvestorName: '',
    irrHasNextPage: false,
    irrHasPreviousPage: false,
    irrLoading: false,
    irrError: null,
    capitalObligationsTimeframe: 'ltd',
    capitalObligations: [],
    capitalObligationsPage: 1,
    capitalObligationsPageSize: LIST_PAGE_SIZE,
    capitalObligationsTotalCount: 0,
    capitalObligationsTotalPages: 0,
    capitalObligationsSearch: '',
    capitalObligationsInvestorName: '',
    capitalObligationsHasNextPage: false,
    capitalObligationsHasPreviousPage: false,
    capitalObligationsLoading: false,
    capitalObligationsError: null,
    netAssetsTimeframe: 'ltd',
    netAssets: [],
    netAssetsPage: 1,
    netAssetsPageSize: LIST_PAGE_SIZE,
    netAssetsTotalCount: 0,
    netAssetsTotalPages: 0,
    netAssetsSearch: '',
    netAssetsInvestorName: '',
    netAssetsHasNextPage: false,
    netAssetsHasPreviousPage: false,
    netAssetsLoading: false,
    netAssetsError: null,
    loading: false,
    error: null,
  };
}

function emptyAssetsDetail(): AssetsDetailState {
  return {
    selectedKey: null,
    detail: null,
    leasingSummary: null,
    loading: false,
    error: null,
  };
}

function emptyInvestorsCache(): InvestorsCacheState {
  return {
    lists: {},
    details: {},
    fundsPages: {},
    periodLists: {},
    commitmentPages: {},
    unfundedCommitmentPages: {},
    capitalInvestmentPages: {},
    distributionPages: {},
    navPages: {},
    capitalActivitiesPages: {},
    distributionTablePages: {},
    irrPages: {},
    capitalObligationsPages: {},
    netAssetsPages: {},
    fundHoldingsPages: {},
  };
}

function emptyFundsCache(): FundsCacheState {
  return {
    lists: {},
    details: {},
    assetPages: {},
    periodLists: {},
    commitmentPages: {},
    unfundedCommitmentPages: {},
    investmentPages: {},
    distributionPages: {},
    investorPages: {},
    navPages: {},
    capitalActivitiesPages: {},
    distributionTablePages: {},
    irrPages: {},
    capitalObligationsPages: {},
    netAssetsPages: {},
  };
}

function emptyAssetsCache(): AssetsCacheState {
  return { lists: {}, details: {} };
}

export const initialCapitalDashboardState: CapitalDashboardState = {
  activeTab: 'dashboard',
  investors: {
    list: { ...emptyInvestorsListState(), loading: true },
    detail: emptyInvestorsDetail(),
    cache: emptyInvestorsCache(),
  },
  funds: {
    list: { ...emptyFundsListState(), loading: true },
    detail: emptyFundsDetail(),
    cache: emptyFundsCache(),
  },
  assets: {
    list: { ...emptyAssetsListState(), loading: true },
    detail: emptyAssetsDetail(),
    cache: emptyAssetsCache(),
  },
};
