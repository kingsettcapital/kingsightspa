import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { DataExplorerDataResponse } from '../interfaces/data-explorer-api.models';
import { DataProduct, FilterLogic, QueryFilter } from '../interfaces/data-explorer.interfaces';

export interface DataExplorerLoadRowsRequest {
  product: string;
  columns: string[];
  sortBy: string;
  sortDir: string;
  groupByField: string;
  filters: QueryFilter[];
  filterLogic: FilterLogic;
  page: number;
  pageSize: number;
}

export const DataExplorerCacheActions = createActionGroup({
  source: 'Data Explorer Cache',
  events: {
    'Reset All': emptyProps(),
  },
});

export const DataExplorerColumnsApiActions = createActionGroup({
  source: 'Data Explorer Columns API',
  events: {
    'Load Columns': props<{ product: string }>(),
    'Load Columns Success': props<{ product: string; products: DataProduct[] }>(),
    'Load Columns Failure': props<{ error: string }>(),
  },
});

export const DataExplorerRowsApiActions = createActionGroup({
  source: 'Data Explorer Rows API',
  events: {
    'Load Rows': props<DataExplorerLoadRowsRequest>(),
    'Load Rows Success': props<{
      result: DataExplorerDataResponse;
      request: DataExplorerLoadRowsRequest;
    }>(),
    'Load Rows Failure': props<{ error: string }>(),
    'Clear Rows': emptyProps(),
  },
});
