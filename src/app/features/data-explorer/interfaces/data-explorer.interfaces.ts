import { DataExplorerRow } from './data-explorer-api.models';

export type { DataExplorerRow };

export type DataColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date';

export interface DataProductField {
  id: string;
  label: string;
  type: DataColumnType;
  dataKey: string;
}

export interface DataProduct {
  id: string;
  label: string;
  description: string;
  fields: DataProductField[];
}

export type FilterOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export interface QueryFilter {
  id: string;
  fieldId: string;
  operator: FilterOperator;
  value: string;
}

export type FilterLogic = 'and' | 'or';

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  selectedFieldIds: string[];
  filters: QueryFilter[];
  filterLogic: FilterLogic;
  groupByFieldId: string | null;
  product?: string;
  savedAt: string;
  /** Present on list responses before full template is loaded. */
  columnCount?: number;
  filterCount?: number;
}

export interface QuickStartTemplate {
  id: string;
  title: string;
  description: string;
  fieldIds: string[];
}

export interface SaveQueryPayload {
  name: string;
  description?: string;
}

export interface FilterOperatorOption {
  value: FilterOperator;
  label: string;
}

export interface DataGroup {
  key: string;
  label: string;
  records: DataExplorerRow[];
  expanded: boolean;
}
