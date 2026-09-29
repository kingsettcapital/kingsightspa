import { DataProductField, DataExplorerRow, FilterLogic, QueryFilter } from '../interfaces/data-explorer.interfaces';

export function getFieldById(
  fields: DataProductField[],
  fieldId: string,
): DataProductField | undefined {
  return fields.find((f) => f.id === fieldId);
}

export function getRecordValue(record: DataExplorerRow, field: DataProductField): string {
  const value = record[field.dataKey];
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function formatCellValue(value: string | number, type: DataProductField['type']): string {
  if (value === '' || value === null || value === undefined) {
    return '—';
  }

  switch (type) {
    case 'currency': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return String(value);
      }
      const abs = Math.abs(value);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(abs);
      return value < 0 ? `(${formatted})` : formatted;
    }
    case 'percent':
      return typeof value === 'number' && Number.isFinite(value)
        ? `${value.toFixed(1)}%`
        : String(value);
    case 'number':
      return typeof value === 'number' ? value.toLocaleString('en-CA') : String(value);
    default:
      return String(value);
  }
}

export function getTypeBadgeClass(type: DataProductField['type']): string {
  switch (type) {
    case 'text':
      return 'text';
    case 'number':
      return 'number';
    case 'currency':
      return 'currency';
    case 'percent':
      return 'percent';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

export function getTypeBadge(type: DataProductField['type']): string {
  switch (type) {
    case 'text':
      return 'TXT';
    case 'number':
      return '#';
    case 'currency':
      return '$';
    case 'percent':
      return '%';
    case 'date':
      return 'DT';
    default:
      return 'TXT';
  }
}

function stripFormattedValue(value: string, type: DataProductField['type']): string {
  switch (type) {
    case 'currency':
      return value.replace(/[$,\s]/g, '');
    case 'percent':
      return value.replace(/[%\s]/g, '');
    case 'number':
      return value.replace(/[,\s]/g, '');
    default:
      return value.trim();
  }
}

function parseFilterNumber(value: string, type: DataProductField['type']): number | null {
  const cleaned = stripFormattedValue(value.trim().toLowerCase(), type);
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function getComparableValues(record: DataExplorerRow, field: DataProductField): string[] {
  const rawValue = record[field.dataKey];
  const raw = getRecordValue(record, field);
  const values = new Set<string>([raw.toLowerCase()]);

  if (field.type === 'text') {
    return [raw.toLowerCase()];
  }

  const formatted = formatCellValue(rawValue as string | number, field.type);
  if (formatted !== '—') {
    values.add(formatted.toLowerCase());
    values.add(stripFormattedValue(formatted, field.type).toLowerCase());
  }

  if (typeof rawValue === 'number') {
    values.add(String(rawValue));
  }

  return [...values];
}

function textEquals(cell: string, query: string): boolean {
  if (cell === query) {
    return true;
  }

  if (cell.startsWith(query)) {
    return true;
  }

  if (cell.endsWith(` ${query}`) || cell.endsWith(query)) {
    return true;
  }

  return cell.includes(` ${query} `);
}

function numericEquals(
  record: DataExplorerRow,
  field: DataProductField,
  query: string,
): boolean | null {
  const rawValue = record[field.dataKey];
  if (typeof rawValue !== 'number') {
    return null;
  }

  const parsedQuery = parseFilterNumber(query, field.type);
  if (parsedQuery === null) {
    return null;
  }

  return rawValue === parsedQuery;
}

function equalsMatch(
  record: DataExplorerRow,
  field: DataProductField,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const numericMatch = numericEquals(record, field, normalizedQuery);
  if (numericMatch !== null) {
    return numericMatch;
  }

  const comparableValues = getComparableValues(record, field);
  if (field.type === 'text') {
    return comparableValues.some((value) => textEquals(value, normalizedQuery));
  }

  const strippedQuery = stripFormattedValue(normalizedQuery, field.type).toLowerCase();
  return comparableValues.some(
    (value) =>
      value === normalizedQuery ||
      stripFormattedValue(value, field.type).toLowerCase() === strippedQuery,
  );
}

function matchesFilter(
  record: DataExplorerRow,
  filter: QueryFilter,
  field: DataProductField,
): boolean {
  const raw = getRecordValue(record, field);
  const query = filter.value.trim().toLowerCase();
  const comparableValues = getComparableValues(record, field);

  switch (filter.operator) {
    case 'contains':
      return comparableValues.some((value) => value.includes(query));
    case 'not_contains':
      return comparableValues.every((value) => !value.includes(query));
    case 'equals':
      return equalsMatch(record, field, filter.value);
    case 'not_equals':
      return !equalsMatch(record, field, filter.value);
    case 'starts_with':
      return comparableValues.some((value) => value.startsWith(query));
    case 'ends_with':
      return comparableValues.some((value) => value.endsWith(query));
    case 'is_empty':
      return raw.trim() === '';
    case 'is_not_empty':
      return raw.trim() !== '';
    default:
      return true;
  }
}

export function isFilterApplied(filter: QueryFilter): boolean {
  if (!filter.fieldId) {
    return false;
  }

  if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
    return true;
  }

  return filter.value.trim().length > 0;
}

/** API expects empty string when 0–1 filters; `and`/`or` only when combining 2+. */
export function resolveApiFilterLogic(
  filters: QueryFilter[],
  filterLogic: FilterLogic,
): '' | FilterLogic {
  const appliedCount = filters.filter((filter) => isFilterApplied(filter)).length;
  return appliedCount <= 1 ? '' : filterLogic;
}

export function applyFilters(
  records: DataExplorerRow[],
  filters: QueryFilter[],
  filterLogic: FilterLogic,
  fields: DataProductField[],
): DataExplorerRow[] {
  const activeFilters = filters.filter((f) => isFilterApplied(f));
  if (!activeFilters.length) {
    return records;
  }

  return records.filter((record) => {
    const results = activeFilters.map((filter) => {
      const field = getFieldById(fields, filter.fieldId);
      if (!field) {
        return true;
      }
      return matchesFilter(record, filter, field);
    });

    return filterLogic === 'and' ? results.every(Boolean) : results.some(Boolean);
  });
}

export function groupRecords(
  records: DataExplorerRow[],
  groupByField: DataProductField | null,
): Map<string, DataExplorerRow[]> {
  if (!groupByField) {
    return new Map([['', records]]);
  }

  const groups = new Map<string, DataExplorerRow[]>();
  for (const record of records) {
    const key = getRecordValue(record, groupByField);
    const existing = groups.get(key) ?? [];
    existing.push(record);
    groups.set(key, existing);
  }

  return groups;
}

export function generateFilterId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateQueryId(): string {
  return `query-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getRowKey(record: DataExplorerRow, index: number): string {
  const parts = Object.entries(record)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${value ?? ''}`);

  return parts.length > 0 ? parts.join('|') : `row-${index}`;
}
