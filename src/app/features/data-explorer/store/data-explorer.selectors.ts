import { createSelector } from '@ngrx/store';

import { dataExplorerFeature } from './data-explorer.reducer';

const { selectColumns, selectRows } = dataExplorerFeature;

export const selectDataExplorerColumns = selectColumns;
export const selectDataExplorerRowsList = selectRows;

export const selectDataExplorerRowsCache = createSelector(
  dataExplorerFeature.selectCache,
  (cache) => cache.rows,
);
