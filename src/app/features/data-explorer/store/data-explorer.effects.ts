import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, EMPTY, map, of, switchMap, withLatestFrom } from 'rxjs';

import { DataExplorerApiService } from '../services/data-explorer-api.service';
import { buildDataExplorerDataRequest, mapColumnGroupsToDataProducts } from '../utils/data-explorer.mapper';
import {
  buildDataExplorerQueryScope,
  readDataExplorerRowsCacheEntry,
} from './data-explorer-cache.util';
import {
  DataExplorerColumnsApiActions,
  DataExplorerRowsApiActions,
} from './data-explorer.actions';
import { selectDataExplorerRowsCache } from './data-explorer.selectors';

@Injectable()
export class DataExplorerEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(DataExplorerApiService);

  readonly loadColumns$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataExplorerColumnsApiActions.loadColumns),
      switchMap(({ product }) =>
        this.api.getColumns(product).pipe(
          map((groups) =>
            DataExplorerColumnsApiActions.loadColumnsSuccess({
              product,
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
        ),
      ),
    ),
  );

  readonly loadRows$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataExplorerRowsApiActions.loadRows),
      withLatestFrom(this.store.select(selectDataExplorerRowsCache)),
      switchMap(([request, cache]) => {
        const scope = buildDataExplorerQueryScope(request);

        if (readDataExplorerRowsCacheEntry(cache, scope, request.page, request.pageSize)) {
          return EMPTY;
        }

        const body = buildDataExplorerDataRequest({
          product: request.product,
          columns: request.columns,
          groupByFieldId: request.groupByField || null,
          filters: request.filters,
          filterLogic: request.filterLogic,
          sortBy: request.sortBy,
          sortDir: request.sortDir,
          page: request.page,
          pageSize: request.pageSize,
        });

        return this.api.queryData(body).pipe(
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
