import {
  PropertyDetailDto,
  PropertyListItemDto,
  PropertySummaryDto,
} from '../models/api.models';
import { formatByFormatType } from './dynamic-sections.util';

type SummaryItem = { key?: string; label?: string; value?: unknown; formatType?: string | null };

function isSummaryItem(value: unknown): value is SummaryItem {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return 'value' in v && ('key' in v || 'label' in v);
}

export function propertySummary(detail: PropertyDetailDto | null): PropertySummaryDto | null {
  return detail?.summary ?? null;
}

export function propertyDetailKey(detail: PropertyDetailDto | null): number | null {
  if (detail?.propertyKey != null) return detail.propertyKey;
  return propertySummary(detail)?.propertyKey ?? null;
}

export function propertyLocation(item: Pick<PropertyListItemDto, 'city' | 'province'>): string {
  const parts = [item.city, item.province].filter((part) => !!part?.trim());
  return parts.join(', ') || 'N/A';
}

export function propertyListName(item: PropertyListItemDto): string {
  return item.propertyName?.trim() || `Property ${item.propertyKey}`;
}

export function propertyListSubtitle(item: PropertyListItemDto): string {
  const type = item.assetType?.trim();
  const location = propertyLocation(item);
  const locationLabel = location !== 'N/A' ? location : '';
  if (type && locationLabel) return `${type} · ${locationLabel}`;
  if (type) return type;
  if (locationLabel) return locationLabel;
  return item.status?.trim() || '—';
}

function summaryRecord(detail: PropertyDetailDto | null): Record<string, unknown> | null {
  const summary = propertySummary(detail);
  return summary ? (summary as unknown as Record<string, unknown>) : null;
}

export function propertyFieldString(detail: PropertyDetailDto | null, key: string): string | null {
  const normalizedKey = key.toLowerCase();

  const value = detail?.fields?.[key];
  if (value != null) {
    const text = String(value).trim();
    return text || null;
  }

  const summary = summaryRecord(detail);
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
          return formatByFormatType(row?.value, row?.formatType) ?? null;
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
      return formatByFormatType(found.value, found.formatType) ?? null;
    }
  }

  return null;
}

export function propertyDetailName(detail: PropertyDetailDto | null): string {
  const fromSummary = propertySummary(detail)?.propertyName?.trim();
  if (fromSummary) return fromSummary;

  const fromFields =
    propertyFieldString(detail, 'property_name') ?? propertyFieldString(detail, 'propertyName');
  if (fromFields) return fromFields;

  const key = propertyDetailKey(detail);
  return key != null ? `Property ${key}` : 'Property';
}

export function propertyDetailLocation(detail: PropertyDetailDto | null): string | null {
  const location = propertySummary(detail)?.location?.trim();
  if (location) return location;

  const city = propertyFieldString(detail, 'city');
  const province = propertyFieldString(detail, 'province');
  const parts = [city, province].filter((part) => !!part);
  return parts.length ? parts.join(', ') : null;
}

export function propertyDetailCurrentValue(detail: PropertyDetailDto | null): number | null {
  const summary = propertySummary(detail);
  if (typeof summary?.currentValue === 'number' && Number.isFinite(summary.currentValue)) {
    return summary.currentValue;
  }
  const fromFields = detail?.fields?.['currentValue'] ?? detail?.fields?.['current_value'];
  if (typeof fromFields === 'number' && Number.isFinite(fromFields)) return fromFields;
  return null;
}

export function propertyDetailYield(detail: PropertyDetailDto | null): number | null {
  const summary = propertySummary(detail);
  const raw = summary?.yield ?? summary?.yieldPercent;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

export function propertyDetailInvestmentsCount(detail: PropertyDetailDto | null): number | null {
  const summary = propertySummary(detail);
  const raw = summary?.investments ?? summary?.investmentsCount ?? detail?.investmentsCount;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

export function propertyDetailAcquisitionYear(detail: PropertyDetailDto | null): string | null {
  const raw =
    propertySummary(detail)?.acquisitionDate?.trim() ||
    propertyFieldString(detail, 'acquisitionDate') ||
    propertyFieldString(detail, 'property_acquisition');
  if (!raw) return null;

  const formatted = formatByFormatType(raw, 'date');
  if (formatted) {
    const yearMatch = formatted.match(/\d{4}/);
    return yearMatch?.[0] ?? formatted;
  }

  const yearMatch = raw.match(/\d{4}/);
  return yearMatch?.[0] ?? raw;
}
