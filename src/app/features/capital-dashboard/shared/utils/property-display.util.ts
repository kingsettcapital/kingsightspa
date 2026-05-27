import { PropertyDetailDto, PropertyListItemDto } from '../models/api.models';
import { formatByFormatType } from './dynamic-sections.util';

type SummaryItem = { key?: string; label?: string; value?: unknown; formatType?: string | null };

function isSummaryItem(value: unknown): value is SummaryItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return 'value' in v && ('key' in v || 'label' in v);
}

export function propertyLocation(item: Pick<PropertyListItemDto, 'city' | 'province'>): string {
  const parts = [item.city, item.province].filter((part) => !!part?.trim());
  return parts.join(', ') || 'N/A';
}

export function propertyListName(item: PropertyListItemDto): string {
  return item.propertyName?.trim() || `Property ${item.propertyKey}`;
}

export function propertyFieldString(detail: PropertyDetailDto | null, key: string): string | null {
  const normalizedKey = key.toLowerCase();

  const value = detail?.fields?.[key];
  if (value != null) {
    const text = String(value).trim();
    return text || null;
  }

  const summary = (detail?.summary ?? null) as Record<string, unknown> | null;
  if (summary) {
    const v = summary[key] ?? summary[normalizedKey];
    if (v != null) {
      const text = String(v).trim();
      return text || null;
    }
  }

  const sections = detail?.sections ?? null;
  if (Array.isArray(sections)) {
    for (const sec of sections) {
      for (const row of sec?.fields ?? []) {
        const rowKey = String(row?.key ?? '').trim().toLowerCase();
        if (rowKey && rowKey === normalizedKey) {
          return formatByFormatType(row?.value, row?.formatType) ?? '—';
        }
      }
    }
  }

  const summaryArray = (detail?.fields as Record<string, unknown> | null | undefined)?.['summary'];
  if (Array.isArray(summaryArray)) {
    const found = summaryArray.find((row) => {
      if (!isSummaryItem(row)) return false;
      const rowKey = String(row.key ?? '').trim();
      return rowKey.toLowerCase() === key.toLowerCase();
    }) as SummaryItem | undefined;
    if (found) {
      return formatByFormatType(found.value, found.formatType) ?? '—';
    }
  }

  return null;
}

export function propertyDetailName(detail: PropertyDetailDto | null): string {
  return (
    propertyFieldString(detail, 'property_name') ??
    propertyFieldString(detail, 'propertyName') ??
    (detail ? `Property ${detail.propertyKey}` : '')
  );
}

export function propertyDetailLocation(detail: PropertyDetailDto | null): string | null {
  const city = propertyFieldString(detail, 'city');
  const province = propertyFieldString(detail, 'province');
  const parts = [city, province].filter((part) => !!part);
  return parts.length ? parts.join(', ') : null;
}

