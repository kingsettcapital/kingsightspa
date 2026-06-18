import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, exhaustMap, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';

import {
  ASSETS_LIST_PAGE_SIZE,
  FUNDS_LIST_PAGE_SIZE,
  INVESTORS_LIST_PAGE_SIZE,
  LIST_PAGE_SIZE,
} from '../shared/list-pagination.constants';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { CapitalFundsApiService } from '../shared/services/capital-funds-api.service';
import { CapitalInvestorsApiService } from '../shared/services/capital-investors-api.service';
import {
  mapFundCommitmentsToAmountTabRows,
  mapFundCommitmentsToTabRows,
} from '../shared/mappers/fund-commitment.mapper';
import { mapFundAssetsToTabRows } from '../shared/mappers/fund-asset.mapper';
import { mapFundInvestorsToTabRows } from '../shared/mappers/fund-investor.mapper';
import { mapFundDistributionGroupsToTabRows } from '../shared/mappers/fund-distribution.mapper';
import { mapFundNavToTabRows } from '../shared/mappers/fund-nav.mapper';
import {
  mapFundCapitalActivitiesToTabRows,
  mapFundDistributionTableToTabRows,
  mapFundIrrToTabRows,
  mapFundCapitalObligationsToTabRows,
  mapFundNetAssetsToTabRows,
} from '../shared/mappers/fund-transaction-tables.mapper';
import {
  mapInvestorCapitalActivitiesToTabRows,
  mapInvestorDistributionTableToTabRows,
  mapInvestorIrrToTabRows,
  mapInvestorCapitalObligationsToTabRows,
  mapInvestorNetAssetsToTabRows,
} from '../shared/mappers/investor-transaction-tables.mapper';
import { mapInvestorFundHoldingsResponse } from '../shared/mappers/investor-fund-holdings.mapper';
import { mapInvestorUnderlyingInvestmentsToTabRows } from '../shared/mappers/investor-underlying-investments.mapper';
import { AssetsApiActions, FundsApiActions, InvestorsApiActions } from './capital-dashboard.actions';
import {
  readFundCommitmentsPageCache,
  readFundNavPageCache,
  readFundPeriodsCache,
  readFundDistributionsPageCache,
  readFundInvestmentsPageCache,
  readFundUnfundedCommitmentsPageCache,
  readFundCapitalActivitiesPageCache,
  readFundDistributionTablePageCache,
  readFundIrrPageCache,
  readFundCapitalObligationsPageCache,
  readFundNetAssetsPageCache,
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
  extractPagedItems,
} from './capital-dashboard-cache.util';
import { selectAssets, selectFunds, selectInvestors } from './capital-dashboard.reducer';
import { selectAssetsList, selectFundsList, selectInvestorsList } from './capital-dashboard.selectors';

@Injectable()
export class CapitalDashboardEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly investorsApi = inject(CapitalInvestorsApiService);
  private readonly fundsApi = inject(CapitalFundsApiService);
  private readonly assetsApi = inject(CapitalAssetsApiService);

  readonly loadInvestorsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadList),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const scope = request.cacheKey ?? '';
        if (readInvestorsListCacheEntry(investors.cache.lists, request.search, request.page, scope)) {
          return EMPTY;
        }
        const apiParams = request.apiParams ?? {
          search: request.search || undefined,
          page: request.page,
          pageSize: INVESTORS_LIST_PAGE_SIZE,
        };
        return this.investorsApi
          .getInvestors(apiParams)
          .pipe(
            map((result) => InvestorsApiActions.loadListSuccess({ result, replace: request.replace })),
            catchError(() =>
              of(InvestorsApiActions.loadListFailure({ error: 'Unable to load investors. Please try again.' })),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorsListMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadListMore),
      withLatestFrom(this.store.select(selectInvestorsList)),
      exhaustMap(([, list]) => {
        if (list.loading || list.loadingMore || !list.hasNextPage) {
          return EMPTY;
        }
        return of(
          InvestorsApiActions.loadList({
            search: list.search,
            page: list.page + 1,
            replace: false,
          }),
        );
      }),
    ),
  );

  readonly loadInvestorDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadDetail),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const cached = investors.cache.details[request.investorKey];
        if (cached) {
          return of(
            InvestorsApiActions.loadDetailSuccess({
              investorKey: request.investorKey,
              detail: cached.detail,
              investments: cached.investments,
              investmentsHasNextPage: cached.investmentsHasNextPage,
            }),
          );
        }
        return this.investorsApi.getInvestor(request.investorKey).pipe(
          map((detail) =>
            InvestorsApiActions.loadDetailSuccess({
              investorKey: request.investorKey,
              detail,
              investments: [],
              investmentsHasNextPage: false,
            }),
          ),
          catchError(() =>
            of(InvestorsApiActions.loadDetailFailure({ error: 'Unable to load investor details.' })),
          ),
        );
      }),
    ),
  );

  readonly loadInvestorFundsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorFundsPage),
      switchMap(({ investorKey, page, search }) =>
        this.investorsApi.getInvestorFundsPage(investorKey, { page, search }).pipe(
          map((result) =>
            InvestorsApiActions.loadInvestorFundsPageSuccess({
              page,
              items: extractPagedItems(result),
              hasNextPage: !!result.hasNextPage,
              append: page > 1,
            }),
          ),
          catchError(() => of(InvestorsApiActions.loadInvestorFundsPageFailure())),
        ),
      ),
    ),
  );

  readonly loadFundsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadList),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const scope = request.cacheKey ?? '';
        if (readFundsListCacheEntry(funds.cache.lists, request.search, request.page, scope)) {
          return EMPTY;
        }
        const apiParams = request.apiParams ?? {
          search: request.search || undefined,
          page: request.page,
          pageSize: FUNDS_LIST_PAGE_SIZE,
        };
        return this.fundsApi
          .getFunds(apiParams)
          .pipe(
            map((result) => FundsApiActions.loadListSuccess({ result, replace: request.replace })),
            catchError(() =>
              of(FundsApiActions.loadListFailure({ error: 'Unable to load investments. Please try again.' })),
            ),
          );
      }),
    ),
  );

  readonly loadFundsListMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadListMore),
      withLatestFrom(this.store.select(selectFundsList)),
      exhaustMap(([, list]) => {
        if (list.loading || list.loadingMore || !list.hasNextPage) {
          return EMPTY;
        }
        return of(
          FundsApiActions.loadList({
            search: list.search,
            page: list.page + 1,
            replace: false,
          }),
        );
      }),
    ),
  );

  readonly loadFundDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadDetail),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        if (funds.cache.details[request.fundKey]) {
          return EMPTY;
        }
        return this.fundsApi.getFund(request.fundKey).pipe(
          map((detail) =>
            FundsApiActions.loadDetailSuccess({
              fundKey: request.fundKey,
              detail,
              assets: [],
              assetsHasNextPage: false,
            }),
          ),
          catchError(() =>
            of(FundsApiActions.loadDetailFailure({ error: 'Unable to load investment details.' })),
          ),
        );
      }),
    ),
  );

  readonly loadFundAssetsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundAssetsPage),
      switchMap(({ fundKey, page, search, replace = true }) =>
        this.fundsApi.getFundAssetsPage(fundKey, { page, search }).pipe(
          map((result) => {
            const items = mapFundAssetsToTabRows(extractPagedItems(result));
            return FundsApiActions.loadFundAssetsPageSuccess({
              page: result.page ?? page,
              pageSize: result.pageSize ?? LIST_PAGE_SIZE,
              totalCount: result.totalCount ?? items.length,
              totalPages: result.totalPages ?? 1,
              items,
              hasNextPage: !!result.hasNextPage,
              hasPreviousPage: !!result.hasPreviousPage,
              replace,
            });
          }),
          catchError(() => of(FundsApiActions.loadFundAssetsPageFailure())),
        ),
      ),
    ),
  );

  readonly loadFundInvestorsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundInvestorsPage),
      switchMap(({ fundKey, page, search }) =>
        this.fundsApi.getFundInvestorsPage(fundKey, { page, search }).pipe(
          map((result) =>
            FundsApiActions.loadFundInvestorsPageSuccess({
              page,
              items: mapFundInvestorsToTabRows(extractPagedItems(result)),
              hasNextPage: !!result.hasNextPage,
              append: page > 1,
            }),
          ),
          catchError(() => of(FundsApiActions.loadFundInvestorsPageFailure())),
        ),
      ),
    ),
  );

  readonly loadFundPeriods$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundPeriods),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        if (readFundPeriodsCache(funds.cache.periodLists, request.fundKey, request.source, request.view)) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundPeriodsPage(request.fundKey, {
            view: request.view,
            source: request.source,
            page: 1,
          })
          .pipe(
            map((result) =>
              FundsApiActions.loadFundPeriodsSuccess({
                fundKey: request.fundKey,
                source: request.source,
                view: request.view,
                items: result.items ?? [],
              }),
            ),
            catchError(() =>
              of(
                FundsApiActions.loadFundPeriodsFailure({
                  fundKey: request.fundKey,
                  source: request.source,
                  view: request.view,
                  error: 'Unable to load periods.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundCommitmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundCommitmentsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        if (
          !search &&
          readFundCommitmentsPageCache(
            funds.cache.commitmentPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundCommitmentsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundCommitmentsToAmountTabRows(result.items, request.timeframe);
              return FundsApiActions.loadFundCommitmentsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundCommitmentsPageFailure({
                  error: 'Unable to load commitments. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundUnfundedCommitmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundUnfundedCommitmentsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        if (
          !search &&
          readFundUnfundedCommitmentsPageCache(
            funds.cache.unfundedCommitmentPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundUnfundedCommitmentsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundCommitmentsToAmountTabRows(result.items, request.timeframe);
              return FundsApiActions.loadFundUnfundedCommitmentsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundUnfundedCommitmentsPageFailure({
                  error: 'Unable to load unfunded commitments. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundInvestmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundInvestmentsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        if (
          !search &&
          readFundInvestmentsPageCache(
            funds.cache.investmentPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundInvestmentsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundCommitmentsToTabRows(result.items, request.timeframe);
              return FundsApiActions.loadFundInvestmentsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundInvestmentsPageFailure({
                  error: 'Unable to load investments. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundDistributionsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundDistributionsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        if (
          !search &&
          readFundDistributionsPageCache(
            funds.cache.distributionPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundDistributionsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const startIndex =
                request.replace || funds.detail.selectedKey !== request.fundKey
                  ? 0
                  : funds.detail.fundDistributions.length;
              const items = mapFundDistributionGroupsToTabRows(
                result.items,
                request.timeframe,
                startIndex,
              );
              return FundsApiActions.loadFundDistributionsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundDistributionsPageFailure({
                  error: 'Unable to load distributions. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundNavPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundNavPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        if (
          !search &&
          readFundNavPageCache(
            funds.cache.navPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundNavPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundNavToTabRows(result.items, request.timeframe);
              return FundsApiActions.loadFundNavPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundNavPageFailure({
                  error: 'Unable to load NAV. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundCapitalActivitiesPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundCapitalActivitiesPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        const investorName = request.investorName?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readFundCapitalActivitiesPageCache(
            funds.cache.capitalActivitiesPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
            investorName,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundCapitalActivitiesPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            investorName,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapFundCapitalActivitiesToTabRows(extractPagedItems(result));
              return FundsApiActions.loadFundCapitalActivitiesPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                investorName,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundCapitalActivitiesPageFailure({
                  error: 'Unable to load capital activities. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundDistributionTablePage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundDistributionTablePage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        const investorName = request.investorName?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readFundDistributionTablePageCache(
            funds.cache.distributionTablePages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
            investorName,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundDistributionTablePage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            investorName,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapFundDistributionTableToTabRows(extractPagedItems(result));
              return FundsApiActions.loadFundDistributionTablePageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                investorName,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundDistributionTablePageFailure({
                  error: 'Unable to load distributions. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundIrrPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundIrrPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        const investorName = request.investorName?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readFundIrrPageCache(
            funds.cache.irrPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
            investorName,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundIrrPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            investorName,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapFundIrrToTabRows(extractPagedItems(result));
              return FundsApiActions.loadFundIrrPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                investorName,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundIrrPageFailure({
                  error: 'Unable to load IRR data. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundCapitalObligationsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundCapitalObligationsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        const investorName = request.investorName?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readFundCapitalObligationsPageCache(
            funds.cache.capitalObligationsPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
            investorName,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundCapitalObligationsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            investorName,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapFundCapitalObligationsToTabRows(extractPagedItems(result));
              return FundsApiActions.loadFundCapitalObligationsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                investorName,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundCapitalObligationsPageFailure({
                  error: 'Unable to load capital obligations. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadFundNetAssetsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundNetAssetsPage),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        const search = request.search.trim();
        const investorName = request.investorName?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readFundNetAssetsPageCache(
            funds.cache.netAssetsPages,
            request.fundKey,
            request.timeframe,
            request.page,
            request.dateKey,
            investorName,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.fundsApi
          .getFundNetAssetsPage(request.fundKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            investorName,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapFundNetAssetsToTabRows(extractPagedItems(result));
              return FundsApiActions.loadFundNetAssetsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                investorName,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                FundsApiActions.loadFundNetAssetsPageFailure({
                  error: 'Unable to load net assets. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );


  readonly loadInvestorPeriods$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorPeriods),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        if (readInvestorPeriodsCache(investors.cache.periodLists, request.investorKey, request.source, request.view)) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorPeriodsPage(request.investorKey, {
            view: request.view,
            source: request.source,
            page: 1,
          })
          .pipe(
            map((result) =>
              InvestorsApiActions.loadInvestorPeriodsSuccess({
                investorKey: request.investorKey,
                source: request.source,
                view: request.view,
                items: extractPagedItems(result),
              }),
            ),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorPeriodsFailure({
                  investorKey: request.investorKey,
                  source: request.source,
                  view: request.view,
                  error: 'Unable to load periods.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorCommitmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorCommitmentsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        if (
          !search &&
          readInvestorCommitmentsPageCache(
            investors.cache.commitmentPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorCommitmentsPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundCommitmentsToAmountTabRows(extractPagedItems(result), request.timeframe);
              return InvestorsApiActions.loadInvestorCommitmentsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorCommitmentsPageFailure({
                  error: 'Unable to load commitments. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorUnfundedCommitmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorUnfundedCommitmentsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        if (
          !search &&
          readInvestorUnfundedCommitmentsPageCache(
            investors.cache.unfundedCommitmentPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorUnfundedCommitmentsPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundCommitmentsToAmountTabRows(extractPagedItems(result), request.timeframe);
              return InvestorsApiActions.loadInvestorUnfundedCommitmentsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorUnfundedCommitmentsPageFailure({
                  error: 'Unable to load unfunded commitments. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorCapitalInvestmentsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorCapitalInvestmentsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        if (
          readInvestorCapitalInvestmentsPageCache(
            investors.cache.capitalInvestmentPages,
            request.investorKey,
            request.page,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi.getInvestorCapitalInvestmentsPage(request.investorKey, {
          page: request.page,
        }).pipe(
          map((result) => {
            const items = mapInvestorUnderlyingInvestmentsToTabRows(extractPagedItems(result));
            return InvestorsApiActions.loadInvestorCapitalInvestmentsPageSuccess({
              page: result.page ?? request.page,
              pageSize: result.pageSize ?? LIST_PAGE_SIZE,
              totalCount: result.totalCount ?? items.length,
              totalPages: result.totalPages ?? 1,
              items,
              hasNextPage: !!result.hasNextPage,
              hasPreviousPage: !!result.hasPreviousPage,
              replace: request.replace,
            });
          }),
          catchError(() =>
            of(
              InvestorsApiActions.loadInvestorCapitalInvestmentsPageFailure({
                error: 'Unable to load investments. Please try again.',
              }),
            ),
          ),
        );
      }),
    ),
  );

  readonly loadInvestorDistributionsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorDistributionsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        if (
          !search &&
          readInvestorDistributionsPageCache(
            investors.cache.distributionPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorDistributionsPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const startIndex =
                request.replace || investors.detail.selectedKey !== request.investorKey
                  ? 0
                  : investors.detail.investorDistributions.length;
              const items = mapFundDistributionGroupsToTabRows(
                extractPagedItems(result),
                request.timeframe,
                startIndex,
              );
              return InvestorsApiActions.loadInvestorDistributionsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorDistributionsPageFailure({
                  error: 'Unable to load distributions. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorNavPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorNavPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        if (
          !search &&
          readInvestorNavPageCache(
            investors.cache.navPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorNavPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
          })
          .pipe(
            map((result) => {
              const items = mapFundNavToTabRows(extractPagedItems(result), request.timeframe);
              return InvestorsApiActions.loadInvestorNavPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                items,
                hasNextPage: !!result.hasNextPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorNavPageFailure({
                  error: 'Unable to load NAV. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorCapitalActivitiesPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorCapitalActivitiesPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        const fundCode = request.fundCode?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readInvestorCapitalActivitiesPageCache(
            investors.cache.capitalActivitiesPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
            fundCode,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorCapitalActivitiesPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            fundCode,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapInvestorCapitalActivitiesToTabRows(extractPagedItems(result));
              return InvestorsApiActions.loadInvestorCapitalActivitiesPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                fundCode,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorCapitalActivitiesPageFailure({
                  error: 'Unable to load capital activities. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorDistributionTablePage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorDistributionTablePage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        const fundCode = request.fundCode?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readInvestorDistributionTablePageCache(
            investors.cache.distributionTablePages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
            fundCode,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorDistributionTablePage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            fundCode,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapInvestorDistributionTableToTabRows(extractPagedItems(result));
              return InvestorsApiActions.loadInvestorDistributionTablePageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                fundCode,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorDistributionTablePageFailure({
                  error: 'Unable to load distributions. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorIrrPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorIrrPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        const fundCode = request.fundCode?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readInvestorIrrPageCache(
            investors.cache.irrPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
            fundCode,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorIrrPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            fundCode,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapInvestorIrrToTabRows(extractPagedItems(result));
              return InvestorsApiActions.loadInvestorIrrPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                fundCode,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorIrrPageFailure({
                  error: 'Unable to load IRR data. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorCapitalObligationsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorCapitalObligationsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        const fundCode = request.fundCode?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readInvestorCapitalObligationsPageCache(
            investors.cache.capitalObligationsPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
            fundCode,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorCapitalObligationsPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            fundCode,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapInvestorCapitalObligationsToTabRows(extractPagedItems(result));
              return InvestorsApiActions.loadInvestorCapitalObligationsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                fundCode,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorCapitalObligationsPageFailure({
                  error: 'Unable to load capital obligations. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorNetAssetsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorNetAssetsPage),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        const search = request.search.trim();
        const fundCode = request.fundCode?.trim() ?? '';
        if (
          !search &&
          !request.sortBy &&
          readInvestorNetAssetsPageCache(
            investors.cache.netAssetsPages,
            request.investorKey,
            request.timeframe,
            request.page,
            request.dateKey,
            fundCode,
            request.calendarYear,
          )
        ) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestorNetAssetsPage(request.investorKey, request.timeframe, {
            page: request.page,
            dateKey: request.dateKey,
            calendarYear: request.calendarYear,
            search: request.search,
            fundCode,
            sortBy: request.sortBy,
            sortDir: request.sortDir,
          })
          .pipe(
            map((result) => {
              const items = mapInvestorNetAssetsToTabRows(extractPagedItems(result));
              return InvestorsApiActions.loadInvestorNetAssetsPageSuccess({
                timeframe: request.timeframe,
                page: result.page ?? request.page,
                pageSize: result.pageSize ?? LIST_PAGE_SIZE,
                totalCount: result.totalCount ?? items.length,
                totalPages: result.totalPages ?? 1,
                items,
                hasNextPage: !!result.hasNextPage,
                hasPreviousPage: !!result.hasPreviousPage,
                replace: request.replace,
                search: request.search,
                dateKey: request.dateKey,
                calendarYear: request.calendarYear,
                fundCode,
                sortBy: request.sortBy,
              });
            }),
            catchError(() =>
              of(
                InvestorsApiActions.loadInvestorNetAssetsPageFailure({
                  error: 'Unable to load net assets. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );

  readonly loadInvestorFundHoldings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(InvestorsApiActions.loadInvestorFundHoldings),
      withLatestFrom(this.store.select(selectInvestors)),
      switchMap(([request, investors]) => {
        if (readInvestorFundHoldingsCache(investors.cache.fundHoldingsPages, request.investorKey)) {
          return EMPTY;
        }
        return this.investorsApi.getInvestorFundHoldings(request.investorKey).pipe(
          map((result) => {
            const mapped = mapInvestorFundHoldingsResponse(result);
            return InvestorsApiActions.loadInvestorFundHoldingsSuccess({
              items: mapped.items,
              dateKey: mapped.dateKey,
            });
          }),
          catchError(() =>
            of(
              InvestorsApiActions.loadInvestorFundHoldingsFailure({
                error: 'Unable to load fund holdings. Please try again.',
              }),
            ),
          ),
        );
      }),
    ),
  );

  readonly loadAssetsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetsApiActions.loadList),
      withLatestFrom(this.store.select(selectAssets)),
      switchMap(([request, assets]) => {
        const scope = request.cacheKey ?? '';
        if (readAssetsListCacheEntry(assets.cache.lists, request.search, request.page, scope)) {
          return EMPTY;
        }
        const apiParams = request.apiParams ?? {
          search: request.search || undefined,
          page: request.page,
          pageSize: ASSETS_LIST_PAGE_SIZE,
        };
        return this.assetsApi
          .getAssets(apiParams)
          .pipe(
            map((result) => AssetsApiActions.loadListSuccess({ result, replace: request.replace })),
            catchError(() =>
              of(AssetsApiActions.loadListFailure({ error: 'Unable to load assets. Please try again.' })),
            ),
          );
      }),
    ),
  );

  readonly loadAssetsListMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetsApiActions.loadListMore),
      withLatestFrom(this.store.select(selectAssetsList)),
      exhaustMap(([, list]) => {
        if (list.loading || list.loadingMore || !list.hasNextPage) {
          return EMPTY;
        }
        return of(
          AssetsApiActions.loadList({
            search: list.search,
            page: list.page + 1,
            replace: false,
          }),
        );
      }),
    ),
  );

  readonly loadAssetDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetsApiActions.loadDetail),
      withLatestFrom(this.store.select(selectAssets)),
      switchMap(([request, assets]) => {
        const cached = assets.cache.details[request.propertyKey];
        if (cached) {
          return of(
            AssetsApiActions.loadDetailSuccess({
              propertyKey: request.propertyKey,
              detail: cached.detail,
              leasingSummary: cached.leasingSummary,
            }),
          );
        }
        return forkJoin({
          detail: this.assetsApi.getAsset(request.propertyKey),
          leasingSummary: this.assetsApi.getAssetLeasingSummary(request.propertyKey).pipe(
            catchError(() => of(null)),
          ),
        }).pipe(
          map(({ detail, leasingSummary }) =>
            AssetsApiActions.loadDetailSuccess({
              propertyKey: request.propertyKey,
              detail,
              leasingSummary,
            }),
          ),
          catchError(() =>
            of(AssetsApiActions.loadDetailFailure({ error: 'Unable to load asset details.' })),
          ),
        );
      }),
    ),
  );
}
