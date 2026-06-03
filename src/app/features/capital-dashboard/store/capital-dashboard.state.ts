import {
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
  FundNavTabRow,
  FundNavTimeframe,
  FundDetailDto,
  FundInvestorDto,
  FundListItemDto,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import {
  AssetDetailCacheEntry,
  FundAssetsPageCacheEntry,
  FundCommitmentsPageCacheEntry,
  FundNavPageCacheEntry,
  FundDetailCacheEntry,
  InvestorDetailCacheEntry,
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
  investments: InvestorInvestmentDto[];
  loading: boolean;
  error: string | null;
}

export interface FundsDetailState {
  selectedKey: number | null;
  detail: FundDetailDto | null;
  investors: FundInvestorDto[];
  investorsLoading: boolean;
  investorsError: string | null;
  assets: PropertyListItemDto[];
  assetsPage: number;
  assetsSearch: string;
  assetsFundCode: string | null;
  assetsHasNextPage: boolean;
  assetsLoading: boolean;
  assetsLoadingMore: boolean;
  commitmentsTimeframe: FundCommitmentTimeframe;
  commitments: FundCommitmentTabRow[];
  commitmentsPage: number;
  commitmentsSearch: string;
  commitmentsHasNextPage: boolean;
  commitmentsLoading: boolean;
  commitmentsLoadingMore: boolean;
  commitmentsError: string | null;
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
}

export interface FundsCacheState {
  lists: Record<string, ListCacheEntry<FundListItemDto>>;
  details: Record<number, FundDetailCacheEntry>;
  assetPages: Record<string, FundAssetsPageCacheEntry>;
  commitmentPages: Record<string, FundCommitmentsPageCacheEntry>;
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
  return {
    selectedKey: null,
    detail: null,
    investments: [],
    loading: false,
    error: null,
  };
}

function emptyFundsDetail(): FundsDetailState {
  return {
    selectedKey: null,
    detail: null,
    investors: [],
    investorsLoading: false,
    investorsError: null,
    assets: [],
    assetsPage: 1,
    assetsSearch: '',
    assetsFundCode: null,
    assetsHasNextPage: false,
    assetsLoading: false,
    assetsLoadingMore: false,
    commitmentsTimeframe: 'ltd',
    commitments: [],
    commitmentsPage: 1,
    commitmentsSearch: '',
    commitmentsHasNextPage: false,
    commitmentsLoading: false,
    commitmentsLoadingMore: false,
    commitmentsError: null,
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
  return { lists: {}, details: {} };
}

function emptyFundsCache(): FundsCacheState {
  return { lists: {}, details: {}, assetPages: {}, commitmentPages: {}, navPages: {} };
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
