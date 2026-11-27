import type { ParamMap } from '@angular/router';

import type { ManagementSummaryFilters } from './management-summary.models';

export type ManagementSummaryFilterOptions = {
  sponsors: string[];
  investorAliases: string[];
  statuses: string[];
};

export const DEFAULT_FILTER_OPTIONS: ManagementSummaryFilterOptions = {
  sponsors: ['All'],
  investorAliases: ['All'],
  statuses: ['Default', 'All'],
};

function isAllOrEmpty(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return !trimmed || trimmed.toLowerCase() === 'all';
}

/** Non-All selections, or undefined when the list means "All". */
function selectedValues(values: readonly string[] | null | undefined): string[] | undefined {
  const list = (values ?? []).map((value) => value.trim()).filter(Boolean);
  if (!list.length || list.some((value) => value.toLowerCase() === 'all')) {
    return undefined;
  }
  return list;
}

export function statusesFromFilters(filters: ManagementSummaryFilters): string[] | undefined {
  return selectedValues(filters.statuses);
}

export function sponsorsFromFilters(filters: ManagementSummaryFilters): string[] | undefined {
  return selectedValues(filters.sponsors);
}

export function investorAliasesFromFilters(filters: ManagementSummaryFilters): string[] | undefined {
  return selectedValues(filters.investorAliases);
}

/**
 * Chip-style multi-select toggle where `allValue` is exclusive:
 * picking All clears the rest; removing the last selection falls back to All.
 */
export function toggleExclusiveSelection(current: readonly string[], value: string, allValue: string): string[] {
  const isAll = (item: string) => item.toLowerCase() === allValue.toLowerCase();
  if (isAll(value)) {
    return [allValue];
  }
  const withoutAll = current.filter((item) => !isAll(item));
  const next = withoutAll.includes(value)
    ? withoutAll.filter((item) => item !== value)
    : [...withoutAll, value];
  return next.length ? next : [allValue];
}

function formatFilterDateLabel(isoDate: string): string {
  const trimmed = isoDate.trim();
  if (!trimmed) {
    return '';
  }
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatFilterDateRange(from: string, to: string): string {
  const start = from.trim();
  const end = to.trim();
  if (!start && !end) {
    return '';
  }
  if (start && end) {
    return `${formatFilterDateLabel(start)} – ${formatFilterDateLabel(end)}`;
  }
  if (start) {
    return `From ${formatFilterDateLabel(start)}`;
  }
  return `To ${formatFilterDateLabel(end)}`;
}

/**
 * Active (non-All / non-empty) filters for report face headers.
 * Format: `Name: value` | `Name: a; b`
 */
export function formatActiveFiltersDisplay(
  filters: ManagementSummaryFilters,
  options?: { asOfDisplay?: string },
): string {
  const parts: string[] = [];

  const asOf =
    options?.asOfDisplay?.trim() ||
    (filters.asOfDate?.trim() ? formatFilterDateLabel(filters.asOfDate) : '');
  if (asOf) {
    parts.push(`As Of: ${asOf}`);
  }

  const defaultDate = formatFilterDateRange(filters.defaultDateFrom, filters.defaultDateTo);
  if (defaultDate) {
    parts.push(`Default Date: ${defaultDate}`);
  }

  const maturityDate = formatFilterDateRange(filters.maturityDateFrom, filters.maturityDateTo);
  if (maturityDate) {
    parts.push(`Maturity Date: ${maturityDate}`);
  }

  const sponsors = sponsorsFromFilters(filters);
  if (sponsors) {
    parts.push(`Sponsor: ${sponsors.join('; ')}`);
  }

  const investors = investorAliasesFromFilters(filters);
  if (investors) {
    parts.push(`Investor Alias: ${investors.join('; ')}`);
  }

  const risks = (filters.riskLevels ?? []).filter((level) => !isAllOrEmpty(level));
  if (risks.length) {
    parts.push(`Risk: ${risks.map((level) => level.trim()).join('; ')}`);
  }

  const statuses = statusesFromFilters(filters);
  if (statuses) {
    parts.push(`Funding Status: ${statuses.join('; ')}`);
  }

  return parts.join(' | ');
}

/** Query params carried between Management Summary and Loan Detail (lists as repeated params). */
export function filtersToQueryParams(
  filters: ManagementSummaryFilters,
  alias?: string,
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = {
    asOfDate: filters.asOfDate,
    statuses: [...filters.statuses],
    sponsors: [...filters.sponsors],
    riskLevels: [...filters.riskLevels],
    investorAliases: [...filters.investorAliases],
  };
  if (alias) {
    params['alias'] = alias;
  }
  if (filters.defaultDateFrom) {
    params['defaultDateFrom'] = filters.defaultDateFrom;
  }
  if (filters.defaultDateTo) {
    params['defaultDateTo'] = filters.defaultDateTo;
  }
  if (filters.maturityDateFrom) {
    params['maturityDateFrom'] = filters.maturityDateFrom;
  }
  if (filters.maturityDateTo) {
    params['maturityDateTo'] = filters.maturityDateTo;
  }
  return params;
}

/** Fallback funding statuses when filter options are not loaded yet. */
export const LOAN_DETAIL_FALLBACK_STATUSES = [
  'Unfunded',
  'Funded',
  'Default',
  'Repaid',
  'All',
] as const;

function isExcludedDetailDefaultStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'repaid' || normalized === 'unfunded';
}

/**
 * True when Summary was filtered to only Repaid or only Unfunded —
 * Detail should open with All so those child loans are visible.
 */
export function shouldUseAllStatusesOnDetail(
  statuses: readonly string[] | null | undefined,
): boolean {
  const selected = selectedValues(statuses ?? undefined);
  return selected?.length === 1 && isExcludedDetailDefaultStatus(selected[0]);
}

/** @deprecated Use shouldUseAllStatusesOnDetail. */
export function isRepaidOnlyStatusSelection(
  statuses: readonly string[] | null | undefined,
): boolean {
  return shouldUseAllStatusesOnDetail(statuses);
}

/**
 * Loan Detail default funding statuses: every option except Repaid, Unfunded, and All.
 * When the parent loan is Repaid/Unfunded-only, callers should use ['All'] instead.
 */
export function defaultLoanDetailStatuses(
  availableStatuses?: readonly string[] | null,
): string[] {
  const source = (availableStatuses?.length ? availableStatuses : LOAN_DETAIL_FALLBACK_STATUSES)
    .map((status) => status.trim())
    .filter(Boolean);
  const withoutExcluded = source.filter(
    (status) =>
      status.toLowerCase() !== 'all' && !isExcludedDetailDefaultStatus(status),
  );
  return withoutExcluded.length > 0 ? withoutExcluded : ['All'];
}

/**
 * Entry query from Management Summary → Loan Detail.
 * Carries As Of, alias, and the Loan Detail funding-status default:
 * all statuses except Repaid/Unfunded, or All when parent is Repaid/Unfunded-only.
 */
export function loanDetailEntryQueryParams(
  asOfDate: string,
  alias?: string,
  options?: {
    useAllStatuses?: boolean;
    /** @deprecated Prefer useAllStatuses. */
    parentIsRepaid?: boolean;
    availableStatuses?: readonly string[] | null;
  },
): Record<string, string | string[]> {
  const params: Record<string, string | string[]> = { asOfDate };
  if (alias?.trim()) {
    params['alias'] = alias.trim();
  }
  const useAll = options?.useAllStatuses === true || options?.parentIsRepaid === true;
  params['statuses'] = useAll
    ? ['All']
    : defaultLoanDetailStatuses(options?.availableStatuses);
  return params;
}

/** Loan Detail defaults: As Of carried over; excludes Repaid and Unfunded unless overridden. */
export function createLoanDetailDefaultFilters(
  asOfDate: string,
  availableStatuses?: readonly string[] | null,
): ManagementSummaryFilters {
  return {
    asOfDate: asOfDate.trim() || '',
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsors: ['All'],
    riskLevels: ['ALL'],
    statuses: defaultLoanDetailStatuses(availableStatuses),
    investorAliases: ['All'],
  };
}

/**
 * Repeated query param values; legacy single keys (`sponsor`, `status`) and
 * comma-joined risk lists are still accepted.
 */
function readListParam(query: ParamMap, key: string, legacyKey?: string, splitCommas = false): string[] | null {
  let values = query.getAll(key);
  if (!values.length && legacyKey) {
    values = query.getAll(legacyKey);
  }
  if (splitCommas && values.length === 1) {
    values = values[0].split(',');
  }
  const list = values.map((value) => value.trim()).filter(Boolean);
  return list.length ? list : null;
}

function overlayFiltersFromQuery(base: ManagementSummaryFilters, query: ParamMap): ManagementSummaryFilters {
  return {
    ...base,
    asOfDate: query.get('asOfDate')?.trim() || base.asOfDate,
    defaultDateFrom: query.get('defaultDateFrom') ?? base.defaultDateFrom,
    defaultDateTo: query.get('defaultDateTo') ?? base.defaultDateTo,
    maturityDateFrom: query.get('maturityDateFrom') ?? base.maturityDateFrom,
    maturityDateTo: query.get('maturityDateTo') ?? base.maturityDateTo,
    sponsors: readListParam(query, 'sponsors', 'sponsor') ?? [...base.sponsors],
    riskLevels: readListParam(query, 'riskLevels', undefined, true) ?? [...base.riskLevels],
    statuses: readListParam(query, 'statuses', 'status') ?? [...base.statuses],
    investorAliases: readListParam(query, 'investorAliases') ?? [...base.investorAliases],
  };
}

/**
 * Build Loan Detail filter state from the URL.
 * Starts from Detail defaults (exclude Repaid) + As Of; overlays filter params when present
 * (so MS entry does not inherit MS investor/sponsor/etc.).
 */
export function loanDetailFiltersFromQuery(
  query: ParamMap,
  fallbackAsOfDate: string,
  availableStatuses?: readonly string[] | null,
): ManagementSummaryFilters {
  const asOfDate = query.get('asOfDate')?.trim() || fallbackAsOfDate;
  return overlayFiltersFromQuery(
    createLoanDetailDefaultFilters(asOfDate, availableStatuses),
    query,
  );
}

export function mergeFiltersFromQuery(
  base: ManagementSummaryFilters,
  query: ParamMap,
): ManagementSummaryFilters {
  return overlayFiltersFromQuery(base, query);
}
