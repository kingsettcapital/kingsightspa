import { DataExplorerDataResponse, DataExplorerRow } from '../interfaces/data-explorer-api.models';
import { DataExplorerRowsListState } from './data-explorer.state';

export interface DataExplorerRowsCacheEntry {
  rows: DataExplorerRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function buildDataExplorerQueryScope(
  columns: string[],
  sortBy: string,
  sortDir: string,
): string {
  return `${[...columns].sort().join('|')}\u0001${sortBy}\u0001${sortDir}`;
}

export function dataExplorerRowsCacheKey(scope: string, page: number, pageSize: number): string {
  return `${scope}\u0000${page}\u0000${pageSize}`;
}

export function readDataExplorerRowsCacheEntry(
  cache: Record<string, DataExplorerRowsCacheEntry>,
  scope: string,
  page: number,
  pageSize: number,
): DataExplorerRowsCacheEntry | null {
  return cache[dataExplorerRowsCacheKey(scope, page, pageSize)] ?? null;
}

export function writeDataExplorerRowsCacheEntry(
  cache: Record<string, DataExplorerRowsCacheEntry>,
  scope: string,
  page: number,
  result: DataExplorerDataResponse,
  pageSize: number,
): Record<string, DataExplorerRowsCacheEntry> {
  const key = dataExplorerRowsCacheKey(scope, page, pageSize);
  return {
    ...cache,
    [key]: {
      rows: [...(result.rows ?? [])],
      page: result.page ?? page,
      pageSize: result.pageSize ?? pageSize,
      totalCount: result.totalCount ?? 0,
      totalPages: Math.max(result.totalPages ?? 1, 1),
    },
  };
}

export function rowsListStateFromCacheEntry(
  columns: string[],
  sortBy: string,
  sortDir: string,
  page: number,
  pageSize: number,
  entry: DataExplorerRowsCacheEntry,
): DataExplorerRowsListState {
  const scope = buildDataExplorerQueryScope(columns, sortBy, sortDir);
  return {
    columns: [...columns],
    sortBy,
    sortDir,
    page: entry.page,
    pageSize: entry.pageSize || pageSize,
    rows: [...entry.rows],
    totalCount: entry.totalCount,
    totalPages: entry.totalPages,
    loading: false,
    error: null,
    queryScope: scope,
  };
}

export function rowsListLoadingState(
  state: DataExplorerRowsListState,
  columns: string[],
  sortBy: string,
  sortDir: string,
  page: number,
  pageSize: number,
): DataExplorerRowsListState {
  const scope = buildDataExplorerQueryScope(columns, sortBy, sortDir);
  const scopeChanged = state.queryScope !== scope;

  return {
    ...state,
    columns: [...columns],
    sortBy,
    sortDir,
    page,
    pageSize,
    queryScope: scope,
    rows: scopeChanged ? [] : state.rows,
    totalCount: scopeChanged ? 0 : state.totalCount,
    totalPages: scopeChanged ? 1 : state.totalPages,
    loading: true,
    error: null,
  };
}

export function applyDataExplorerRowsResult(
  state: DataExplorerRowsListState,
  result: DataExplorerDataResponse,
): DataExplorerRowsListState {
  return {
    ...state,
    rows: [...(result.rows ?? [])],
    page: result.page ?? state.page,
    pageSize: result.pageSize ?? state.pageSize,
    totalCount: result.totalCount ?? 0,
    totalPages: Math.max(result.totalPages ?? 1, 1),
    loading: false,
    error: null,
  };
}
