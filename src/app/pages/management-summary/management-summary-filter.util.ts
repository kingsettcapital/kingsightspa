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
