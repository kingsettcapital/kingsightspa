import { DataExplorerDataResponse, DataExplorerRow } from '../interfaces/data-explorer-api.models';
import { DataExplorerLoadRowsRequest } from './data-explorer.actions';
import { DataExplorerRowsListState } from './data-explorer.state';

export interface DataExplorerRowsCacheEntry {
  rows: DataExplorerRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function buildDataExplorerQueryScope(request: DataExplorerLoadRowsRequest): string {
  const appliedFilters = request.filters
    .map((filter) => `${filter.fieldId}:${filter.operator}:${filter.value}`)
    .sort()
    .join('|');

  return [
    request.product,
    [...request.columns].sort().join('|'),
    request.sortBy,
    request.sortDir,
    request.groupByField,
    appliedFilters,
    request.filterLogic,
  ].join('\u0001');
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
  request: DataExplorerLoadRowsRequest,
  entry: DataExplorerRowsCacheEntry,
): DataExplorerRowsListState {
  const scope = buildDataExplorerQueryScope(request);
  return {
    columns: [...request.columns],
    sortBy: request.sortBy,
    sortDir: request.sortDir,
    page: entry.page,
    pageSize: entry.pageSize || request.pageSize,
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
  request: DataExplorerLoadRowsRequest,
): DataExplorerRowsListState {
  const scope = buildDataExplorerQueryScope(request);
  const scopeChanged = state.queryScope !== scope;

  return {
    ...state,
    columns: [...request.columns],
    sortBy: request.sortBy,
    sortDir: request.sortDir,
    page: request.page,
    pageSize: request.pageSize,
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
