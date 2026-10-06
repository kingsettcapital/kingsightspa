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

/**
 * Entry query from Management Summary → Loan Detail.
 * Only As Of (and alias) are shared; other MS filters stay on the summary session.
 */
export function loanDetailEntryQueryParams(
  asOfDate: string,
  alias?: string,
): Record<string, string> {
  const params: Record<string, string> = { asOfDate };
  if (alias?.trim()) {
    params['alias'] = alias.trim();
  }
  return params;
}

/** Loan Detail defaults: everything All except the carried As Of date. */
export function createLoanDetailDefaultFilters(asOfDate: string): ManagementSummaryFilters {
  return {
    asOfDate: asOfDate.trim() || '',
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsors: ['All'],
    riskLevels: ['ALL'],
    statuses: ['All'],
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
 * Starts from All defaults + As Of; only overlays filter params when present
 * (so MS entry with only asOfDate does not inherit MS investor/status/etc.).
 */
export function loanDetailFiltersFromQuery(query: ParamMap, fallbackAsOfDate: string): ManagementSummaryFilters {
  const asOfDate = query.get('asOfDate')?.trim() || fallbackAsOfDate;
  return overlayFiltersFromQuery(createLoanDetailDefaultFilters(asOfDate), query);
}

export function mergeFiltersFromQuery(
  base: ManagementSummaryFilters,
  query: ParamMap,
): ManagementSummaryFilters {
  return overlayFiltersFromQuery(base, query);
}
