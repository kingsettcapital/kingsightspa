import { createFeature, createReducer, on } from '@ngrx/store';

import {
  AssetsApiActions,
  CapitalDashboardShellActions,
  FundsApiActions,
  InvestorsApiActions,
} from './capital-dashboard.actions';
import { CapitalDashboardState, initialCapitalDashboardState, PagedListState } from './capital-dashboard.state';

function applyPagedList<T>(
  state: PagedListState<T>,
  result: { items?: T[] | null; page?: number; totalCount?: number; hasNextPage?: boolean },
  replace: boolean,
): PagedListState<T> {
  const items = result.items ?? [];
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

export const capitalDashboardFeature = createFeature({
  name: 'capitalDashboard',
  reducer: createReducer(
    initialCapitalDashboardState,

    on(CapitalDashboardShellActions.activeTabChanged, (state, { tab }) => ({
      ...state,
      activeTab: tab,
    })),

    // Investors list
    on(InvestorsApiActions.loadList, (state, { search, replace }) => ({
      ...state,
      investors: {
        ...state.investors,
        list: {
          ...state.investors.list,
          search,
          loading: replace,
          loadingMore: !replace,
          error: null,
          ...(replace ? { hasNextPage: false } : {}),
        },
      },
    })),
    on(InvestorsApiActions.loadListSuccess, (state, { result, replace }) => ({
      ...state,
      investors: {
        ...state.investors,
        list: applyPagedList(state.investors.list, result, replace),
      },
    })),
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
    on(InvestorsApiActions.loadDetail, (state, { investorKey }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          selectedKey: investorKey,
          detail: null,
          investments: [],
          loading: true,
          error: null,
        },
      },
    })),
    on(InvestorsApiActions.loadDetailSuccess, (state, { investorKey, detail, investments }) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: {
          selectedKey: investorKey,
          detail,
          investments,
          loading: false,
          error: null,
        },
      },
    })),
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
    on(InvestorsApiActions.clearDetail, (state) => ({
      ...state,
      investors: {
        ...state.investors,
        detail: initialCapitalDashboardState.investors.detail,
      },
    })),

    // Funds list
    on(FundsApiActions.loadList, (state, { search, replace }) => ({
      ...state,
      funds: {
        ...state.funds,
        list: {
          ...state.funds.list,
          search,
          loading: replace,
          loadingMore: !replace,
          error: null,
          ...(replace ? { hasNextPage: false } : {}),
        },
      },
    })),
    on(FundsApiActions.loadListSuccess, (state, { result, replace }) => ({
      ...state,
      funds: {
        ...state.funds,
        list: applyPagedList(state.funds.list, result, replace),
      },
    })),
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
    on(FundsApiActions.loadDetail, (state, { fundKey }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          selectedKey: fundKey,
          detail: null,
          investors: [],
          assets: [],
          assetsPage: 1,
          assetsFundCode: null,
          assetsHasNextPage: false,
          assetsLoading: true,
          assetsLoadingMore: false,
          loading: true,
          error: null,
        },
      },
    })),
    on(FundsApiActions.loadDetailSuccess, (state, { fundKey, detail, investors, assets, assetsHasNextPage, assetsFundCode }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          selectedKey: fundKey,
          detail,
          investors,
          assets,
          assetsPage: 1,
          assetsFundCode,
          assetsHasNextPage,
          assetsLoading: false,
          assetsLoadingMore: false,
          loading: false,
          error: null,
        },
      },
    })),
    on(FundsApiActions.loadDetailFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          detail: null,
          investors: [],
          assets: [],
          loading: false,
          assetsLoading: false,
          error,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPage, (state, { page }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          assetsLoading: page === 1,
          assetsLoadingMore: page > 1,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPageSuccess, (state, { page, items, hasNextPage, append }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          assetsPage: page,
          assets: append ? [...state.funds.detail.assets, ...items] : [...items],
          assetsHasNextPage: hasNextPage,
          assetsLoading: false,
          assetsLoadingMore: false,
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
          assetsLoadingMore: false,
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
    on(AssetsApiActions.loadList, (state, { search, replace }) => ({
      ...state,
      assets: {
        ...state.assets,
        list: {
          ...state.assets.list,
          search,
          loading: replace,
          loadingMore: !replace,
          error: null,
          ...(replace ? { hasNextPage: false } : {}),
        },
      },
    })),
    on(AssetsApiActions.loadListSuccess, (state, { result, replace }) => ({
      ...state,
      assets: {
        ...state.assets,
        list: applyPagedList(state.assets.list, result, replace),
      },
    })),
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
    on(AssetsApiActions.loadDetail, (state, { propertyKey }) => ({
      ...state,
      assets: {
        ...state.assets,
        detail: {
          selectedKey: propertyKey,
          detail: null,
          investments: [],
          loading: true,
          error: null,
        },
      },
    })),
    on(AssetsApiActions.loadDetailSuccess, (state, { propertyKey, detail, investments }) => ({
      ...state,
      assets: {
        ...state.assets,
        detail: {
          selectedKey: propertyKey,
          detail,
          investments,
          loading: false,
          error: null,
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
          investments: [],
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
