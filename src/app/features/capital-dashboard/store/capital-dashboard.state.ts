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

export interface CapitalDashboardState {
  activeTab: CapitalDashboardTab;
  investors: {
    list: PagedListState<InvestorListItemDto>;
    detail: InvestorsDetailState;
  };
  funds: {
    list: PagedListState<FundListItemDto>;
    detail: FundsDetailState;
  };
  assets: {
    list: PagedListState<PropertyListItemDto>;
    detail: AssetsDetailState;
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

export const initialCapitalDashboardState: CapitalDashboardState = {
  activeTab: 'investor',
  investors: {
    list: emptyListState(),
    detail: emptyInvestorsDetail(),
  },
  funds: {
    list: emptyListState(),
    detail: emptyFundsDetail(),
  },
  assets: {
    list: emptyListState(),
    detail: emptyAssetsDetail(),
  },
};
