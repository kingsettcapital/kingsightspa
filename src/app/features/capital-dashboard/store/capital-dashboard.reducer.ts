import { createFeature, createReducer, on } from '@ngrx/store';

import {
  FundDetailCacheEntry,
  listStateFromCacheEntry,
  readFundCommitmentsPageCache,
  readFundNavPageCache,
  readListCacheEntry,
  writeFundCommitmentsPageCache,
  writeFundNavPageCache,
  writeListCacheEntry,
} from './capital-dashboard-cache.util';
import {
  CapitalDashboardState,
  FundsDetailState,
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

function listLoadingState<T>(
  state: PagedListState<T>,
  search: string,
  replace: boolean,
): PagedListState<T> {
  return {
    ...state,
    search,
    loading: replace,
    loadingMore: !replace,
    error: null,
    ...(replace ? { hasNextPage: false } : {}),
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
    on(InvestorsApiActions.loadList, (state, { search, page, replace }) => {
      const cached = readListCacheEntry(state.investors.cache.lists, search, page);
      if (cached) {
        const list = listStateFromCacheEntry(search, cached);
        return {
          ...state,
          investors: {
            ...state.investors,
            list: replace ? list : applyPagedList(state.investors.list, cached, false),
          },
        };
      }
      return {
        ...state,
        investors: {
          ...state.investors,
          list: listLoadingState(state.investors.list, search, replace),
        },
      };
    }),
    on(InvestorsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.investors.list.search;
      const page = result.page ?? state.investors.list.page;
      return {
        ...state,
        investors: {
          ...state.investors,
          list: applyPagedList(state.investors.list, result, replace),
          cache: {
            ...state.investors.cache,
            lists: writeListCacheEntry(state.investors.cache.lists, search, result, page),
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
              selectedKey: investorKey,
              detail: cached.detail,
              investments: cached.investments,
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
            selectedKey: investorKey,
            detail: null,
            investments: [],
            loading: true,
            error: null,
          },
        },
      };
    }),
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
        cache: {
          ...state.investors.cache,
          details: {
            ...state.investors.cache.details,
            [investorKey]: { detail, investments },
          },
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
    on(FundsApiActions.loadList, (state, { search, page, replace }) => {
      const cached = readListCacheEntry(state.funds.cache.lists, search, page);
      if (cached) {
        const list = listStateFromCacheEntry(search, cached);
        return {
          ...state,
          funds: {
            ...state.funds,
            list: replace ? list : applyPagedList(state.funds.list, cached, false),
          },
        };
      }
      return {
        ...state,
        funds: {
          ...state.funds,
          list: listLoadingState(state.funds.list, search, replace),
        },
      };
    }),
    on(FundsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.funds.list.search;
      const page = result.page ?? state.funds.list.page;
      return {
        ...state,
        funds: {
          ...state.funds,
          list: applyPagedList(state.funds.list, result, replace),
          cache: {
            ...state.funds.cache,
            lists: writeListCacheEntry(state.funds.cache.lists, search, result, page),
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
              ...emptyFundNavDetail(),
              selectedKey: fundKey,
              detail: cached.detail,
              investors: cached.investors,
              investorsLoading: false,
              investorsError: null,
              assets: [...cached.assets],
              assetsPage: cached.assetsPage,
              assetsSearch: '',
              assetsFundCode: cached.assetsFundCode,
              assetsHasNextPage: cached.assetsHasNextPage,
              assetsLoading: false,
              assetsLoadingMore: false,
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
            ...emptyFundNavDetail(),
            selectedKey: fundKey,
            detail: null,
            investors: [],
            investorsLoading: true,
            investorsError: null,
            assets: [],
            assetsPage: 1,
            assetsSearch: '',
            assetsFundCode: null,
            assetsHasNextPage: false,
            assetsLoading: true,
            assetsLoadingMore: false,
            loading: true,
            error: null,
          },
        },
      };
    }),
    on(
      FundsApiActions.loadDetailSuccess,
      (state, { fundKey, detail, investors, assets, assetsHasNextPage, assetsFundCode }) => {
        const entry: FundDetailCacheEntry = {
          detail,
          investors,
          assets: [...assets],
          assetsPage: 1,
          assetsFundCode,
          assetsHasNextPage,
        };
        return {
          ...state,
          funds: {
            ...state.funds,
            detail: {
              ...emptyFundCommitmentsDetail(),
              ...emptyFundNavDetail(),
              selectedKey: fundKey,
              detail,
              investors,
              investorsLoading: false,
              investorsError: null,
              assets,
              assetsPage: 1,
              assetsSearch: '',
              assetsFundCode,
              assetsHasNextPage,
              assetsLoading: false,
              assetsLoadingMore: false,
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
          investors: [],
          investorsLoading: false,
          investorsError: null,
          assets: [],
          loading: false,
          assetsLoading: false,
          error,
        },
      },
    })),
    on(FundsApiActions.loadFundInvestors, (state, { fundKey }) => {
      // Avoid clobbering investors if the requested fund isn't selected anymore.
      if (state.funds.detail.selectedKey !== fundKey) return state;
      return {
        ...state,
        funds: {
          ...state.funds,
          detail: {
            ...state.funds.detail,
            investorsLoading: true,
            investorsError: null,
          },
        },
      };
    }),
    on(FundsApiActions.loadFundInvestorsSuccess, (state, { investors }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          investors,
          investorsLoading: false,
          investorsError: null,
        },
      },
    })),
    on(FundsApiActions.loadFundInvestorsFailure, (state, { error }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          investorsLoading: false,
          investorsError: error,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPage, (state, { fundKey, fundCode, page, search }) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: {
          ...state.funds.detail,
          assetsSearch: search,
          assetsLoading: page === 1,
          assetsLoadingMore: page > 1,
        },
      },
    })),
    on(FundsApiActions.loadFundAssetsPageSuccess, (state, { page, items, hasNextPage, append }) => {
      const fundKey = state.funds.detail.selectedKey;
      const fundCode = state.funds.detail.assetsFundCode;
      const nextAssets = append ? [...state.funds.detail.assets, ...items] : [...items];
      const nextDetail = {
        ...state.funds.detail,
        assetsPage: page,
        assets: nextAssets,
        assetsHasNextPage: hasNextPage,
        assetsLoading: false,
        assetsLoadingMore: false,
      };
      const nextCache = { ...state.funds.cache };
      if (fundKey != null && fundCode) {
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
    on(
      FundsApiActions.loadFundCommitmentsPage,
      (state, { fundKey, timeframe, page, search, replace, quarterYear = '' }) => {
        const qy = quarterYear ?? '';
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
          readFundCommitmentsPageCache(state.funds.cache.commitmentPages, fundKey, timeframe, page, qy);
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
      (state, { timeframe, page, items, hasNextPage, replace, search, quarterYear }) => {
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
              quarterYear,
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
    on(FundsApiActions.loadFundNavPage, (state, { fundKey, timeframe, page, search, replace, quarterYear = '' }) => {
      const qy = quarterYear ?? '';
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
        !search.trim() && readFundNavPageCache(state.funds.cache.navPages, fundKey, timeframe, page, qy);
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
      (state, { timeframe, page, items, hasNextPage, replace, search, quarterYear }) => {
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
              quarterYear,
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
    on(FundsApiActions.clearDetail, (state) => ({
      ...state,
      funds: {
        ...state.funds,
        detail: initialCapitalDashboardState.funds.detail,
      },
    })),

    // Assets list
    on(AssetsApiActions.loadList, (state, { search, page, replace }) => {
      const cached = readListCacheEntry(state.assets.cache.lists, search, page);
      if (cached) {
        const list = listStateFromCacheEntry(search, cached);
        return {
          ...state,
          assets: {
            ...state.assets,
            list: replace ? list : applyPagedList(state.assets.list, cached, false),
          },
        };
      }
      return {
        ...state,
        assets: {
          ...state.assets,
          list: listLoadingState(state.assets.list, search, replace),
        },
      };
    }),
    on(AssetsApiActions.loadListSuccess, (state, { result, replace }) => {
      const search = state.assets.list.search;
      const page = result.page ?? state.assets.list.page;
      return {
        ...state,
        assets: {
          ...state.assets,
          list: applyPagedList(state.assets.list, result, replace),
          cache: {
            ...state.assets.cache,
            lists: writeListCacheEntry(state.assets.cache.lists, search, result, page),
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
              investments: cached.investments,
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
            investments: [],
            loading: true,
            error: null,
          },
        },
      };
    }),
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
        cache: {
          ...state.assets.cache,
          details: {
            ...state.assets.cache.details,
            [propertyKey]: { detail, investments },
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
