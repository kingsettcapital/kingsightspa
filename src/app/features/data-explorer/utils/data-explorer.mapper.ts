import { DataExplorerColumnDto, DataExplorerColumnGroupDto } from '../interfaces/data-explorer-api.models';
import { DataColumnType, DataProduct } from '../interfaces/data-explorer.interfaces';

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
