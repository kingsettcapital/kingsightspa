import {
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundAssetTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundListItemDto,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { FundInvestorTabRow } from '../investments/tabs/fund-investor.mapper';
import {
  AssetDetailCacheEntry,
  FundAssetsPageCacheEntry,
  FundAmountPageCacheEntry,
  FundCommitmentsPageCacheEntry,
  FundDistributionsPageCacheEntry,
  FundInvestorsPageCacheEntry,
  FundNavPageCacheEntry,
  FundPeriodsCacheEntry,
  FundDetailCacheEntry,
  InvestorDetailCacheEntry,
  InvestorFundsPageCacheEntry,
  InvestorAmountPageCacheEntry,
  InvestorCapitalInvestmentsPageCacheEntry,
  InvestorDistributionsPageCacheEntry,
  InvestorNavPageCacheEntry,
  InvestorPeriodsCacheEntry,
  ListCacheEntry,
} from './capital-dashboard-cache.util';

export type CapitalDashboardTab = 'investor' | 'investment' | 'asset';

export interface PagedListState<T> {
  items: T[];
  search: string;
  page: number;
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
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
  capitalInvestmentsTimeframe: FundCommitmentTimeframe;
  capitalInvestments: FundCommitmentTabRow[];
  capitalInvestmentsPage: number;
  capitalInvestmentsSearch: string;
  capitalInvestmentsHasNextPage: boolean;
  capitalInvestmentsLoading: boolean;
  capitalInvestmentsLoadingMore: boolean;
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
  loading: boolean;
  error: string | null;
}

export interface FundsDetailState {
  selectedKey: number | null;
  detail: FundDetailDto | null;
  assets: FundAssetTabRow[];
  assetsPage: number;
  assetsSearch: string;
  assetsHasNextPage: boolean;
  assetsLoading: boolean;
  assetsLoadingMore: boolean;
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
  loading: boolean;
  error: string | null;
}

export interface AssetsDetailState {
  selectedKey: number | null;
  detail: PropertyDetailDto | null;
  investments: PropertyInvestmentDto[];
  loading: boolean;
  error: string | null;
}

export interface InvestorsCacheState {
  lists: Record<string, ListCacheEntry<InvestorListItemDto>>;
  details: Record<number, InvestorDetailCacheEntry>;
  fundsPages: Record<string, InvestorFundsPageCacheEntry>;
  periodLists: Record<string, InvestorPeriodsCacheEntry>;
  commitmentPages: Record<string, InvestorAmountPageCacheEntry>;
  unfundedCommitmentPages: Record<string, InvestorAmountPageCacheEntry>;
  capitalInvestmentPages: Record<string, InvestorCapitalInvestmentsPageCacheEntry>;
  distributionPages: Record<string, InvestorDistributionsPageCacheEntry>;
  navPages: Record<string, InvestorNavPageCacheEntry>;
}

export interface FundsCacheState {
  lists: Record<string, ListCacheEntry<FundListItemDto>>;
  details: Record<number, FundDetailCacheEntry>;
  assetPages: Record<string, FundAssetsPageCacheEntry>;
  periodLists: Record<string, FundPeriodsCacheEntry>;
  commitmentPages: Record<string, FundAmountPageCacheEntry>;
  unfundedCommitmentPages: Record<string, FundAmountPageCacheEntry>;
  investmentPages: Record<string, FundCommitmentsPageCacheEntry>;
  distributionPages: Record<string, FundDistributionsPageCacheEntry>;
  investorPages: Record<string, FundInvestorsPageCacheEntry>;
  navPages: Record<string, FundNavPageCacheEntry>;
}

export interface AssetsCacheState {
  lists: Record<string, ListCacheEntry<PropertyListItemDto>>;
  details: Record<number, AssetDetailCacheEntry>;
}

export interface CapitalDashboardState {
  activeTab: CapitalDashboardTab;
  investors: {
    list: PagedListState<InvestorListItemDto>;
    detail: InvestorsDetailState;
    cache: InvestorsCacheState;
  };
  funds: {
    list: PagedListState<FundListItemDto>;
    detail: FundsDetailState;
    cache: FundsCacheState;
  };
  assets: {
    list: PagedListState<PropertyListItemDto>;
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
    loading: false,
    loadingMore: false,
    error: null,
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
    capitalInvestmentsTimeframe: fundsDetail.fundInvestmentsTimeframe,
    capitalInvestments: [],
    capitalInvestmentsPage: 1,
    capitalInvestmentsSearch: '',
    capitalInvestmentsHasNextPage: false,
    capitalInvestmentsLoading: false,
    capitalInvestmentsLoadingMore: false,
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
    assetsSearch: '',
    assetsHasNextPage: false,
    assetsLoading: false,
    assetsLoadingMore: false,
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
    loading: false,
    error: null,
  };
}

function emptyAssetsDetail(): AssetsDetailState {
  return {
    selectedKey: null,
    detail: null,
    investments: [],
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
  };
}

function emptyAssetsCache(): AssetsCacheState {
  return { lists: {}, details: {} };
}

export const initialCapitalDashboardState: CapitalDashboardState = {
  activeTab: 'investor',
  investors: {
    list: { ...emptyListState(), loading: true },
    detail: emptyInvestorsDetail(),
    cache: emptyInvestorsCache(),
  },
  funds: {
    list: { ...emptyListState(), loading: true },
    detail: emptyFundsDetail(),
    cache: emptyFundsCache(),
  },
  assets: {
    list: { ...emptyListState(), loading: true },
    detail: emptyAssetsDetail(),
    cache: emptyAssetsCache(),
  },
};
