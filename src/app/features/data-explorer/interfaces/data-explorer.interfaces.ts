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
  savedAt: string;
}

export interface QuickStartTemplate {
  id: string;
  title: string;
  description: string;
  fieldIds: string[];
}

export interface DataExplorerRecord {
  propertyId: string;
  propertyName: string;
  address: string;
  city: string;
  province: string;
  assetClass: string;
  gla: number;
  status: string;
  acquisitionDate: string;
  marketValue: number;
  occupancy: number;
  noi: number;
  tenantName: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: number;
  revenue: number;
  expenses: number;
  noiFinancial: number;
  capRate: number;
  transactionType: string;
  transactionDate: string;
  transactionValue: number;
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
  records: DataExplorerRecord[];
  expanded: boolean;
}
