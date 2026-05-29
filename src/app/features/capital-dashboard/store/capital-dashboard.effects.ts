import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, exhaustMap, forkJoin, map, of, switchMap, withLatestFrom } from 'rxjs';

import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { CapitalFundsApiService } from '../shared/services/capital-funds-api.service';
import { CapitalInvestorsApiService } from '../shared/services/capital-investors-api.service';
import { AssetsApiActions, FundsApiActions, InvestorsApiActions } from './capital-dashboard.actions';
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
      switchMap(({ search, page, replace }) =>
        this.investorsApi.getInvestors({ search: search || undefined, page, pageSize: LIST_PAGE_SIZE }).pipe(
          map((result) => InvestorsApiActions.loadListSuccess({ result, replace })),
          catchError(() =>
            of(InvestorsApiActions.loadListFailure({ error: 'Unable to load investors. Please try again.' })),
          ),
        ),
      ),
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
      switchMap(({ investorKey }) =>
        forkJoin({
          detail: this.investorsApi.getInvestor(investorKey),
          investments: this.investorsApi.getInvestorInvestments(investorKey),
        }).pipe(
          map(({ detail, investments }) =>
            InvestorsApiActions.loadDetailSuccess({ investorKey, detail, investments }),
          ),
          catchError(() =>
            of(InvestorsApiActions.loadDetailFailure({ error: 'Unable to load investor details.' })),
          ),
        ),
      ),
    ),
  );

  readonly loadFundsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadList),
      switchMap(({ search, page, replace }) =>
        this.fundsApi.getFunds({ search: search || undefined, page, pageSize: LIST_PAGE_SIZE }).pipe(
          map((result) => FundsApiActions.loadListSuccess({ result, replace })),
          catchError(() =>
            of(FundsApiActions.loadListFailure({ error: 'Unable to load investments. Please try again.' })),
          ),
        ),
      ),
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
      switchMap(({ fundKey }) =>
        forkJoin({
          detail: this.fundsApi.getFund(fundKey),
          investors: this.fundsApi.getFundInvestors(fundKey),
        }).pipe(
          switchMap(({ detail, investors }) => {
            const fundCode = detail.summary.fundCode?.trim() || null;
            if (!fundCode) {
              return of(
                FundsApiActions.loadDetailSuccess({
                  fundKey,
                  detail,
                  investors,
                  assets: [],
                  assetsHasNextPage: false,
                  assetsFundCode: null,
                }),
              );
            }
            return this.assetsApi.getAssetsForFundPage(fundKey, fundCode, 1).pipe(
              map((assetsPage) =>
                FundsApiActions.loadDetailSuccess({
                  fundKey,
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
                    fundKey,
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
        ),
      ),
    ),
  );

  readonly loadFundAssetsPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FundsApiActions.loadFundAssetsPage),
      switchMap(({ fundKey, fundCode, page }) =>
        this.assetsApi.getAssetsForFundPage(fundKey, fundCode, page).pipe(
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

  readonly loadAssetsList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssetsApiActions.loadList),
      switchMap(({ search, page, replace }) =>
        this.assetsApi.getAssets({ search: search || undefined, page, pageSize: LIST_PAGE_SIZE }).pipe(
          map((result) => AssetsApiActions.loadListSuccess({ result, replace })),
          catchError(() =>
            of(AssetsApiActions.loadListFailure({ error: 'Unable to load assets. Please try again.' })),
          ),
        ),
      ),
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
      switchMap(({ propertyKey }) =>
        forkJoin({
          detail: this.assetsApi.getAsset(propertyKey),
          investments: this.assetsApi.getAssetInvestments(propertyKey),
        }).pipe(
          map(({ detail, investments }) =>
            AssetsApiActions.loadDetailSuccess({ propertyKey, detail, investments }),
          ),
          catchError(() =>
            of(AssetsApiActions.loadDetailFailure({ error: 'Unable to load asset details.' })),
          ),
        ),
      ),
    ),
  );
}
