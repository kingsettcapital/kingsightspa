import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, map, of, switchMap, withLatestFrom } from 'rxjs';

import { DataExplorerApiService } from '../services/data-explorer-api.service';
import { mapColumnGroupsToDataProducts } from '../utils/data-explorer.mapper';
import {
  buildDataExplorerQueryScope,
  readDataExplorerRowsCacheEntry,
} from './data-explorer-cache.util';
import {
  DataExplorerColumnsApiActions,
  DataExplorerRowsApiActions,
} from './data-explorer.actions';
import { selectDataExplorerColumns, selectDataExplorerRowsCache } from './data-explorer.selectors';

@Injectable()
export class DataExplorerEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(DataExplorerApiService);

  readonly loadColumns$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataExplorerColumnsApiActions.loadColumns),
      withLatestFrom(this.store.select(selectDataExplorerColumns)),
      switchMap(([, columnsState]) => {
        if (columnsState.products.length > 0) {
          return EMPTY;
        }

        return this.api.getColumns().pipe(
          map((groups) =>
            DataExplorerColumnsApiActions.loadColumnsSuccess({
              products: mapColumnGroupsToDataProducts(groups),
            }),
          ),
          catchError(() =>
            of(
              DataExplorerColumnsApiActions.loadColumnsFailure({
                error: 'Failed to load columns. Please refresh and try again.',
              }),
            ),
          ),
        );
      }),
    ),
  );

  readonly loadRows$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataExplorerRowsApiActions.loadRows),
      withLatestFrom(this.store.select(selectDataExplorerRowsCache)),
      switchMap(([request, cache]) => {
        const scope = buildDataExplorerQueryScope(
          request.columns,
          request.sortBy,
          request.sortDir,
        );

        if (readDataExplorerRowsCacheEntry(cache, scope, request.page, request.pageSize)) {
          return EMPTY;
        }

        return this.api
          .queryData({
            columns: request.columns,
            search: '',
            sortBy: request.sortBy,
            sortDir: request.sortDir,
            page: request.page,
            pageSize: request.pageSize,
          })
          .pipe(
            map((result) =>
              DataExplorerRowsApiActions.loadRowsSuccess({
                result,
                request,
              }),
            ),
            catchError(() =>
              of(
                DataExplorerRowsApiActions.loadRowsFailure({
                  error: 'Failed to load data. Please try again.',
                }),
              ),
            ),
          );
      }),
    ),
  );
}
