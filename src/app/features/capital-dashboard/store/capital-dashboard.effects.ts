import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, exhaustMap, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';

import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { CapitalFundsApiService } from '../shared/services/capital-funds-api.service';
import { CapitalInvestorsApiService } from '../shared/services/capital-investors-api.service';
import {
  mapFundCommitmentsToAmountTabRows,
  mapFundCommitmentsToTabRows,
} from '../investments/tabs/commitments/fund-commitment.mapper';
import { mapFundNavToTabRows } from '../investments/tabs/nav/fund-nav.mapper';
import { AssetsApiActions, FundsApiActions, InvestorsApiActions } from './capital-dashboard.actions';
import {
  readFundCommitmentsPageCache,
  readFundNavPageCache,
  readFundPeriodsCache,
  readFundDistributionsPageCache,
  readFundInvestmentsPageCache,
  readFundUnfundedCommitmentsPageCache,
  readListCacheEntry,
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
        if (readListCacheEntry(investors.cache.lists, request.search, request.page)) {
          return EMPTY;
        }
        return this.investorsApi
          .getInvestors({ search: request.search || undefined, page: request.page, pageSize: LIST_PAGE_SIZE })
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
        if (investors.cache.details[request.investorKey]) {
          return EMPTY;
        }
        return forkJoin({
          detail: this.investorsApi.getInvestor(request.investorKey),
          investments: this.investorsApi.getInvestorInvestments(request.investorKey),
        }).pipe(
          map(({ detail, investments }) =>
            InvestorsApiActions.loadDetailSuccess({
              investorKey: request.investorKey,
              detail,
              investments,
            }),
          ),
          catchError(() =>
            of(InvestorsApiActions.loadDetailFailure({ error: 'Unable to load investor details.' })),
          ),
        );
      }),
    ),
  );

  readonly loadFundsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadList),
      withLatestFrom(this.store.select(selectFunds)),
      switchMap(([request, funds]) => {
        if (readListCacheEntry(funds.cache.lists, request.search, request.page)) {
          return EMPTY;
        }
        return this.fundsApi
          .getFunds({ search: request.search || undefined, page: request.page, pageSize: LIST_PAGE_SIZE })
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
        return forkJoin({
          detail: this.fundsApi.getFund(request.fundKey),
          investors: this.fundsApi.getFundInvestors(request.fundKey),
        }).pipe(
          switchMap(({ detail, investors }) => {
            const fundCode = detail.summary.fundCode?.trim() || null;
            if (!fundCode) {
              return of(
                FundsApiActions.loadDetailSuccess({
                  fundKey: request.fundKey,
                  detail,
                  investors,
                  assets: [],
                  assetsHasNextPage: false,
                  assetsFundCode: null,
                }),
              );
            }
            return this.assetsApi.getAssetsForFundPage(request.fundKey, fundCode, 1, undefined).pipe(
              map((assetsPage) =>
                FundsApiActions.loadDetailSuccess({
                  fundKey: request.fundKey,
                  detail,
                  investors,
                  assets: assetsPage.items ?? [],
                  assetsHasNextPage: assetsPage.hasNextPage,
                  assetsFundCode: fundCode,
                }),
              ),
              catchError(() =>
                of(
                  FundsApiActions.loadDetailSuccess({
                    fundKey: request.fundKey,
                    detail,
                    investors,
                    assets: [],
                    assetsHasNextPage: false,
                    assetsFundCode: fundCode,
                  }),
                ),
              ),
            );
          }),
          catchError(() =>
            of(FundsApiActions.loadDetailFailure({ error: 'Unable to load investment details.' })),
          ),
        );
      }),
    ),
  );

  readonly loadFundInvestors$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundInvestors),
      switchMap(({ fundKey, search }) =>
        this.fundsApi.getFundInvestors(fundKey, { search: search.trim() || undefined }).pipe(
          map((investors) => FundsApiActions.loadFundInvestorsSuccess({ investors })),
          catchError(() =>
            of(FundsApiActions.loadFundInvestorsFailure({ error: 'Unable to load fund investors.' })),
          ),
        ),
      ),
    ),
  );

  readonly loadFundAssetsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundAssetsPage),
      switchMap(({ fundKey, fundCode, page, search }) =>
        this.assetsApi.getAssetsForFundPage(fundKey, fundCode, page, search.trim() || undefined).pipe(
          map((result) =>
            FundsApiActions.loadFundAssetsPageSuccess({
              page,
              items: result.items ?? [],
              hasNextPage: result.hasNextPage,
              append: page > 1,
            }),
          ),
          catchError(() => of(FundsApiActions.loadFundAssetsPageFailure())),
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
              const items = mapFundCommitmentsToTabRows(result.items, request.timeframe);
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

  readonly loadAssetsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetsApiActions.loadList),
      withLatestFrom(this.store.select(selectAssets)),
      switchMap(([request, assets]) => {
        if (readListCacheEntry(assets.cache.lists, request.search, request.page)) {
          return EMPTY;
        }
        return this.assetsApi
          .getAssets({ search: request.search || undefined, page: request.page, pageSize: LIST_PAGE_SIZE })
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
        if (assets.cache.details[request.propertyKey]) {
          return EMPTY;
        }
        return forkJoin({
          detail: this.assetsApi.getAsset(request.propertyKey),
          investments: this.assetsApi.getAssetInvestments(request.propertyKey),
        }).pipe(
          map(({ detail, investments }) =>
            AssetsApiActions.loadDetailSuccess({
              propertyKey: request.propertyKey,
              detail,
              investments,
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
