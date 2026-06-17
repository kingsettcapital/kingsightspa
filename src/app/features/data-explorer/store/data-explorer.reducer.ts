import { createFeature, createReducer, on } from '@ngrx/store';

import {
  applyDataExplorerRowsResult,
  buildDataExplorerQueryScope,
  readDataExplorerRowsCacheEntry,
  rowsListLoadingState,
  rowsListStateFromCacheEntry,
  writeDataExplorerRowsCacheEntry,
} from './data-explorer-cache.util';
import {
  DataExplorerCacheActions,
  DataExplorerColumnsApiActions,
  DataExplorerRowsApiActions,
} from './data-explorer.actions';
import { initialDataExplorerState } from './data-explorer.state';

export const dataExplorerFeature = createFeature({
  name: 'dataExplorer',
  reducer: createReducer(
    initialDataExplorerState,

    on(DataExplorerCacheActions.resetAll, () => initialDataExplorerState),

    on(DataExplorerColumnsApiActions.loadColumns, (state) => {
      if (state.columns.products.length > 0) {
        return state;
      }
      return {
        ...state,
        columns: {
          ...state.columns,
          loading: true,
          error: null,
        },
      };
    }),
    on(DataExplorerColumnsApiActions.loadColumnsSuccess, (state, { products }) => ({
      ...state,
      columns: {
        products,
        loading: false,
        error: null,
      },
    })),
    on(DataExplorerColumnsApiActions.loadColumnsFailure, (state, { error }) => ({
      ...state,
      columns: {
        ...state.columns,
        loading: false,
        error,
      },
    })),

    on(DataExplorerRowsApiActions.clearRows, (state) => ({
      ...state,
      rows: initialDataExplorerState.rows,
    })),
    on(DataExplorerRowsApiActions.loadRows, (state, { columns, sortBy, sortDir, page, pageSize }) => {
      const scope = buildDataExplorerQueryScope(columns, sortBy, sortDir);
      const cached = readDataExplorerRowsCacheEntry(state.cache.rows, scope, page, pageSize);
      if (cached) {
        return {
          ...state,
          rows: rowsListStateFromCacheEntry(columns, sortBy, sortDir, page, pageSize, cached),
        };
      }

      return {
        ...state,
        rows: rowsListLoadingState(state.rows, columns, sortBy, sortDir, page, pageSize),
      };
    }),
    on(DataExplorerRowsApiActions.loadRowsSuccess, (state, { result, request }) => {
      const scope = buildDataExplorerQueryScope(
        request.columns,
        request.sortBy,
        request.sortDir,
      );

      return {
        ...state,
        rows: applyDataExplorerRowsResult(state.rows, result),
        cache: {
          ...state.cache,
          rows: writeDataExplorerRowsCacheEntry(
            state.cache.rows,
            scope,
            request.page,
            result,
            request.pageSize,
          ),
        },
      };
    }),
    on(DataExplorerRowsApiActions.loadRowsFailure, (state, { error }) => ({
      ...state,
      rows: {
        ...state.rows,
        loading: false,
        error,
      },
    })),
  ),
});

export const {
  name: dataExplorerFeatureKey,
  reducer: dataExplorerReducer,
  selectDataExplorerState,
  selectColumns,
  selectRows,
  selectCache,
} = dataExplorerFeature;
