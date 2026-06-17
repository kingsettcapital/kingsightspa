export interface DataExplorerColumnDto {
  name: string;
  field: string;
  label: string;
  group: string;
  dataType: string;
  type: string;
  ordinal: number;
}

export interface DataExplorerColumnGroupDto {
  group: string;
  columns: DataExplorerColumnDto[];
}

export interface DataExplorerDataRequest {
  columns: string[];
  search: string;
  sortBy: string;
  sortDir: string;
  page: number;
  pageSize: number;
}

export interface DataExplorerDataResponse {
  columns: DataExplorerColumnDto[];
  rows: DataExplorerRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type DataExplorerRow = Record<string, string | number | boolean | null | undefined>;

export interface DataExplorerTemplateFilterDto {
  field: string;
  operator: string;
  value: string;
}

export interface DataExplorerTemplateListItemDto {
  templateId: string;
  name: string;
  description?: string | null;
  columnCount: number;
  filterCount: number;
  groupByField?: string | null;
  createdBy?: string | null;
  createdAt: string;
  modifiedAt?: string | null;
}

export interface DataExplorerTemplateDto {
  templateId: string;
  name: string;
  description?: string | null;
  sourceView?: string | null;
  columns: string[];
  filters: DataExplorerTemplateFilterDto[];
  filterLogic: string;
  groupByField?: string | null;
  createdBy?: string | null;
  createdAt: string;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
}

export interface DataExplorerTemplateUpsertRequest {
  name: string;
  description?: string;
  columns: string[];
  filters: DataExplorerTemplateFilterDto[];
  filterLogic: string;
  groupByField?: string;
}
