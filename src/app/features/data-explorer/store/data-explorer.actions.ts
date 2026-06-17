import { createActionGroup, emptyProps, props } from '@ngrx/store';

import { DataExplorerColumnGroupDto, DataExplorerDataResponse } from '../interfaces/data-explorer-api.models';
import { DataProduct } from '../interfaces/data-explorer.interfaces';

export interface DataExplorerLoadRowsRequest {
  columns: string[];
  sortBy: string;
  sortDir: string;
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
    'Load Columns': emptyProps(),
    'Load Columns Success': props<{ products: DataProduct[] }>(),
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
