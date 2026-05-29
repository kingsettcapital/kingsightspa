import {
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
  assets: PropertyListItemDto[];
  assetsPage: number;
  assetsFundCode: string | null;
  assetsHasNextPage: boolean;
  assetsLoading: boolean;
  assetsLoadingMore: boolean;
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
    assets: [],
    assetsPage: 1,
    assetsFundCode: null,
    assetsHasNextPage: false,
    assetsLoading: false,
    assetsLoadingMore: false,
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
  return { lists: {}, details: {}, assetPages: {} };
}

function emptyAssetsCache(): AssetsCacheState {
  return { lists: {}, details: {} };
}

export const initialCapitalDashboardState: CapitalDashboardState = {
  activeTab: 'investor',
  investors: {
    list: emptyListState(),
    detail: emptyInvestorsDetail(),
    cache: emptyInvestorsCache(),
  },
  funds: {
    list: emptyListState(),
    detail: emptyFundsDetail(),
    cache: emptyFundsCache(),
  },
  assets: {
    list: emptyListState(),
    detail: emptyAssetsDetail(),
    cache: emptyAssetsCache(),
  },
};
