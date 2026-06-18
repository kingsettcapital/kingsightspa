import { DataExplorerColumnDto, DataExplorerColumnGroupDto } from '../interfaces/data-explorer-api.models';
import {
  DataExplorerDataRequest,
  DataExplorerTemplateDto,
  DataExplorerTemplateFilterDto,
  DataExplorerTemplateListItemDto,
  DataExplorerTemplateUpsertRequest,
} from '../interfaces/data-explorer-api.models';
import {
  DataColumnType,
  DataProduct,
  FilterLogic,
  QueryFilter,
  SavedQuery,
  SaveQueryPayload,
} from '../interfaces/data-explorer.interfaces';
import { generateFilterId, isFilterApplied, resolveApiFilterLogic } from './data-explorer.utils';

function slugifyGroup(group: string): string {
  return group
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapColumnType(column: DataExplorerColumnDto): DataColumnType {
  const apiType = column.type?.toLowerCase();
  if (apiType === 'date') {
    return 'date';
  }
  if (apiType === 'percent') {
    return 'percent';
  }
  if (apiType === 'currency') {
    return 'currency';
  }
  if (apiType === 'number') {
    if (
      column.dataType === 'decimal' &&
      /amount|nav|value|revenue|cost|price|rent/i.test(column.field)
    ) {
      return 'currency';
    }
    return 'number';
  }
  return 'text';
}

export function mapColumnGroupsToDataProducts(groups: DataExplorerColumnGroupDto[]): DataProduct[] {
  return groups.map((group) => ({
    id: slugifyGroup(group.group),
    label: group.group,
    description: `${group.group} columns`,
    fields: [...group.columns]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((column) => ({
        id: column.field,
        label: column.label,
        type: mapColumnType(column),
        dataKey: column.field,
      })),
  }));
}

function parseFilterLogic(value: string | null | undefined): FilterLogic {
  return value?.trim().toLowerCase() === 'or' ? 'or' : 'and';
}

function mapTemplateFilterFromDto(filter: DataExplorerTemplateFilterDto): QueryFilter {
  return {
    id: generateFilterId(),
    fieldId: filter.field,
    operator: filter.operator as QueryFilter['operator'],
    value: filter.value ?? '',
  };
}

function normalizeTemplateId(templateId: string | number): string {
  return String(templateId);
}

export function mapTemplateListItemToSavedQuery(dto: DataExplorerTemplateListItemDto): SavedQuery {
  const groupBy = dto.groupByField?.trim();
  const product = dto.product?.trim();
  return {
    id: normalizeTemplateId(dto.templateId),
    name: dto.name,
    description: dto.description?.trim() || undefined,
    selectedFieldIds: [],
    filters: [],
    filterLogic: 'and',
    groupByFieldId: groupBy ? groupBy : null,
    product: product || undefined,
    savedAt: dto.modifiedAt ?? dto.createdAt,
    columnCount: dto.columnCount,
    filterCount: dto.filterCount,
  };
}

export function mapTemplateToSavedQuery(dto: DataExplorerTemplateDto): SavedQuery {
  const groupBy = dto.groupByField?.trim();
  const product = dto.product?.trim();
  return {
    id: normalizeTemplateId(dto.templateId),
    name: dto.name,
    description: dto.description?.trim() || undefined,
    selectedFieldIds: [...(dto.columns ?? [])],
    filters: (dto.filters ?? []).map(mapTemplateFilterFromDto),
    filterLogic: parseFilterLogic(dto.filterLogic),
    groupByFieldId: groupBy ? groupBy : null,
    product: product || undefined,
    savedAt: dto.modifiedAt ?? dto.createdAt,
    columnCount: dto.columns?.length ?? 0,
    filterCount: dto.filters?.length ?? 0,
  };
}

export function mapSavedQueryStateToTemplateRequest(
  payload: SaveQueryPayload,
  state: Omit<SavedQuery, 'id' | 'name' | 'description' | 'savedAt'>,
): DataExplorerTemplateUpsertRequest {
  const appliedFilters = state.filters.filter((filter) => isFilterApplied(filter));

  return {
    product: state.product ?? '',
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    columns: [...state.selectedFieldIds],
    filters: appliedFilters.map((filter) => ({
      field: filter.fieldId,
      operator: filter.operator,
      value: filter.value ?? '',
    })),
    filterLogic: resolveApiFilterLogic(state.filters, state.filterLogic),
    groupByField: state.groupByFieldId ?? '',
  };
}

export function buildDataExplorerDataRequest(input: {
  product: string;
  columns: string[];
  groupByFieldId: string | null;
  filters: QueryFilter[];
  filterLogic: FilterLogic;
  sortBy: string;
  sortDir: string;
  page: number;
  pageSize: number;
}): DataExplorerDataRequest {
  const appliedFilters = input.filters.filter((filter) => isFilterApplied(filter));
  const request: DataExplorerDataRequest = {
    product: input.product,
    columns: [...input.columns],
    page: input.page,
    pageSize: input.pageSize,
  };

  if (input.groupByFieldId) {
    request.groupByField = input.groupByFieldId;
  }

  if (appliedFilters.length > 0) {
    request.filters = appliedFilters.map((filter) => ({
      field: filter.fieldId,
      operator: filter.operator,
      value: filter.value ?? '',
    }));
    request.filterLogic = resolveApiFilterLogic(input.filters, input.filterLogic);
  }

  if (input.sortBy.trim()) {
    request.sortBy = input.sortBy;
    request.sortDir = input.sortDir;
  }

  return request;
}
