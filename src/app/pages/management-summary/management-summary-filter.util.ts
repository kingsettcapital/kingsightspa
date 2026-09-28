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

export function statusesFromFilters(filters: ManagementSummaryFilters): string[] | undefined {
  if (!filters.status || filters.status === 'All') {
    return undefined;
  }
  return [filters.status];
}

export function investorAliasesFromFilters(filters: ManagementSummaryFilters): string[] | undefined {
  const aliases = filters.investorAliases.filter((alias) => alias.trim() && alias !== 'All');
  return aliases.length ? aliases : undefined;
}

function isAllOrEmpty(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  return !trimmed || trimmed.toLowerCase() === 'all';
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

  if (!isAllOrEmpty(filters.sponsor)) {
    parts.push(`Sponsor: ${filters.sponsor.trim()}`);
  }

  const investors = (filters.investorAliases ?? []).filter((alias) => !isAllOrEmpty(alias));
  if (investors.length) {
    parts.push(`Investor Alias: ${investors.map((alias) => alias.trim()).join('; ')}`);
  }

  const risks = (filters.riskLevels ?? []).filter((level) => !isAllOrEmpty(level));
  if (risks.length) {
    parts.push(`Risk: ${risks.map((level) => level.trim()).join('; ')}`);
  }

  if (!isAllOrEmpty(filters.status)) {
    parts.push(`Funding Status: ${filters.status.trim()}`);
  }

  return parts.join(' | ');
}

/** Query params carried between Management Summary and Loan Detail. */
export function filtersToQueryParams(
  filters: ManagementSummaryFilters,
  alias?: string,
): Record<string, string> {
  const params: Record<string, string> = {
    asOfDate: filters.asOfDate,
    status: filters.status,
    sponsor: filters.sponsor,
    riskLevels: filters.riskLevels.join(','),
    investorAliases: filters.investorAliases.join(','),
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
    sponsor: 'All',
    riskLevels: ['ALL'],
    status: 'All',
    investorAliases: ['All'],
  };
}

/**
 * Build Loan Detail filter state from the URL.
 * Starts from All defaults + As Of; only overlays filter params when present
 * (so MS entry with only asOfDate does not inherit MS investor/status/etc.).
 */
export function loanDetailFiltersFromQuery(query: ParamMap, fallbackAsOfDate: string): ManagementSummaryFilters {
  const asOfDate = query.get('asOfDate')?.trim() || fallbackAsOfDate;
  const base = createLoanDetailDefaultFilters(asOfDate);

  const riskRaw = query.get('riskLevels');
  const investorRaw = query.get('investorAliases');
  const status = query.get('status')?.trim();
  const sponsor = query.get('sponsor')?.trim();

  return {
    ...base,
    defaultDateFrom: query.get('defaultDateFrom') ?? base.defaultDateFrom,
    defaultDateTo: query.get('defaultDateTo') ?? base.defaultDateTo,
    maturityDateFrom: query.get('maturityDateFrom') ?? base.maturityDateFrom,
    maturityDateTo: query.get('maturityDateTo') ?? base.maturityDateTo,
    sponsor: sponsor || base.sponsor,
    riskLevels: riskRaw
      ? riskRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [...base.riskLevels],
    status: status || base.status,
    investorAliases: investorRaw
      ? investorRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [...base.investorAliases],
  };
}

export function mergeFiltersFromQuery(
  base: ManagementSummaryFilters,
  query: ParamMap,
): ManagementSummaryFilters {
  const riskRaw = query.get('riskLevels');
  const investorRaw = query.get('investorAliases');
  return {
    asOfDate: query.get('asOfDate')?.trim() || base.asOfDate,
    defaultDateFrom: query.get('defaultDateFrom') ?? base.defaultDateFrom,
    defaultDateTo: query.get('defaultDateTo') ?? base.defaultDateTo,
    maturityDateFrom: query.get('maturityDateFrom') ?? base.maturityDateFrom,
    maturityDateTo: query.get('maturityDateTo') ?? base.maturityDateTo,
    sponsor: query.get('sponsor')?.trim() || base.sponsor,
    riskLevels: riskRaw
      ? riskRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [...base.riskLevels],
    status: query.get('status')?.trim() || base.status,
    investorAliases: investorRaw
      ? investorRaw.split(',').map((v) => v.trim()).filter(Boolean)
      : [...base.investorAliases],
  };
}
