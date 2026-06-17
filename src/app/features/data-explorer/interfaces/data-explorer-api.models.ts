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
