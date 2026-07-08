import { LoanStatusFilterOption } from '../services/loan-security-value-api.service';

/** Preferred displayLabel for the default grid Status filter (dim_status). */
export const DEFAULT_STATUS_LABEL = 'Default';

const DEFAULT_STATUS_LABEL_ALIASES = new Set([
  'default',
  'in default',
  'in_default',
  'indefault',
]);

const DEFAULT_STATUS_VALUE_ALIASES = new Set(['2', 'default', 'in_default', 'in default']);

/**
 * Resolves which status_key values should be selected when the page loads.
 * Prefers API displayLabel "Default" (and common aliases), then status value "2".
 */
export function resolveDefaultStatusValues(options: LoanStatusFilterOption[]): string[] {
  if (!options.length) {
    return [];
  }

  const preferred = options.find((option) => {
    const label = option.displayLabel.trim().toLowerCase();
    const value = option.value.trim().toLowerCase();
    return (
      DEFAULT_STATUS_LABEL_ALIASES.has(label) ||
      DEFAULT_STATUS_VALUE_ALIASES.has(value) ||
      value === '2'
    );
  });

  const fallback = options.find((option) => option.value !== '(null)') ?? options[0];
  return [preferred?.value ?? fallback.value];
}

export function toStatusSelectOptions(
  options: LoanStatusFilterOption[],
): { label: string; value: string }[] {
  return options.map((option) => ({
    label: option.displayLabel || option.value,
    value: option.value,
  }));
}

/** Normalizes status API payloads (string[] or object[]) into filter options. */
export function normalizeStatusOptions(statuses: unknown): LoanStatusFilterOption[] {
  if (!Array.isArray(statuses) || !statuses.length) {
    return [];
  }
  if (typeof statuses[0] === 'string') {
    return (statuses as string[])
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => ({ value: s, displayLabel: s }));
  }
  return (statuses as Record<string, unknown>[])
    .map((row) => {
      const value = String(row['value'] ?? row['statusKey'] ?? row['status_key'] ?? '').trim();
      const displayLabel = String(
        row['displayLabel'] ?? row['statusName'] ?? row['status_name'] ?? value,
      ).trim();
      return { value, displayLabel: displayLabel || value };
    })
    .filter((row) => row.value.length > 0 || row.displayLabel.length > 0);
}
