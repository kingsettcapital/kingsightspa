export type SectionRow = {
  label: string;
  value: string;
  key?: string | null;
  formatType?: string | null;
};
export type SectionCard = { title: string; rows: ReadonlyArray<SectionRow> };

export function toFieldLabel(key: string): string {
  const withSpaces = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  return withSpaces
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export function formatByFormatType(value: unknown, formatType: string | null | undefined): string | null {
  if (value == null) return null;
  const t = (formatType ?? '').toLowerCase();

  const toNumber = (v: unknown): number | null => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return null;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const toTrimmed = (v: unknown): string | null => {
    const s = String(v).trim();
    return s ? s : null;
  };

  switch (t) {
    case 'money': {
      const n = toNumber(value);
      if (n == null) return toTrimmed(value);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n);
    }
    case 'percent': {
      const n = toNumber(value);
      if (n == null) return toTrimmed(value);
      const prefix = n > 0 ? '+' : '';
      return `${prefix}${n.toFixed(1)}%`;
    }
    case 'date': {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return toTrimmed(value);
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
    case 'datetime': {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return toTrimmed(value);
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    }
    case 'year': {
      const n = toNumber(value);
      if (n != null) return String(Math.trunc(n));
      const match = String(value).match(/\d{4}/);
      return match ? match[0] : toTrimmed(value);
    }
    case 'integer': {
      const n = toNumber(value);
      if (n == null) return toTrimmed(value);
      return String(Math.trunc(n));
    }
    case 'number': {
      const n = toNumber(value);
      if (n == null) return toTrimmed(value);
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (v === 'true' || v === 'yes' || v === '1') return 'Yes';
        if (v === 'false' || v === 'no' || v === '0') return 'No';
      }
      return toTrimmed(value);
    }
    case 'status':
    case 'text':
    default:
      return toTrimmed(value);
  }
}

export function sectionCardsFromSections(
  sections:
    | ReadonlyArray<{
        title?: string | null;
        fields?: ReadonlyArray<{ key?: string | null; value?: unknown; formatType?: string | null }> | null;
      }>
    | null
    | undefined,
): ReadonlyArray<SectionCard> {
  if (!sections?.length) return [];
  return sections
    .map((section) => {
      const title = (section.title ?? '').trim() || 'Details';
      const rows: SectionRow[] = [];
      for (const f of section.fields ?? []) {
        const key = f?.key ?? null;
        const label = (key ? toFieldLabel(key) : 'Field').trim();
        const value = formatByFormatType(f?.value, f?.formatType) ?? '—';
        rows.push({ label, value, key, formatType: f?.formatType ?? null });
      }
      return { title, rows };
    })
    .filter((c) => c.rows.length > 0);
}

