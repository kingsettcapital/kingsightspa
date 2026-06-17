import { DataExplorerRow } from '../interfaces/data-explorer-api.models';
import { DATA_EXPLORER_DEFAULT_PAGE_SIZE } from '../constants/data-explorer.constants';
import { DataProduct } from '../interfaces/data-explorer.interfaces';
import { DataExplorerRowsCacheEntry } from './data-explorer-cache.util';

export interface DataExplorerColumnsState {
  products: DataProduct[];
  loading: boolean;
  error: string | null;
}

export interface DataExplorerRowsListState {
  columns: string[];
  sortBy: string;
  sortDir: string;
  page: number;
  pageSize: number;
  rows: DataExplorerRow[];
  totalCount: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  queryScope: string;
}

export interface DataExplorerState {
  columns: DataExplorerColumnsState;
  rows: DataExplorerRowsListState;
  cache: {
    rows: Record<string, DataExplorerRowsCacheEntry>;
  };
}

export const initialDataExplorerRowsListState: DataExplorerRowsListState = {
  columns: [],
  sortBy: '',
  sortDir: 'asc',
  page: 1,
  pageSize: DATA_EXPLORER_DEFAULT_PAGE_SIZE,
  rows: [],
  totalCount: 0,
  totalPages: 1,
  loading: false,
  error: null,
  queryScope: '',
};

export const initialDataExplorerState: DataExplorerState = {
  columns: {
    products: [],
    loading: false,
    error: null,
  },
  rows: initialDataExplorerRowsListState,
  cache: {
    rows: {},
  },
};
