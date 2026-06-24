import type {
  ChartSlice,
  CmhcWatchlistRow,
  ExposureAnalysisRow,
  InvestorSummaryRow,
  LoanAliasSummaryRow,
  LtvRiskBandRow,
  ManagementSummaryKpis,
  OutstandingInterestSummary,
  SponsorSummaryRow,
  TopExposureRow,
} from './management-summary.models';
import type { ManagementSummaryDashboardDto } from '../../core/services/management-summary-api.service';

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
}

function formatAsOfDisplay(asOfDate: string): string {
  const parsed = new Date(`${asOfDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return asOfDate;
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function mapChartSlice(slice: {
  label: string;
  value: number;
  sharePercent?: number | null;
}): ChartSlice {
  return {
    label: slice.label,
    value: slice.value,
    sharePercent: slice.sharePercent ?? 0,
  };
}

function parseMissed(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapManagementSummaryDashboard(dto: ManagementSummaryDashboardDto) {
  const charts = dto.chartsPhase2;

  const loanRows: LoanAliasSummaryRow[] = (dto.loanAliasRows ?? []).map((row) => ({
    loanAliasKey: row.loanAliasKey,
    loanAlias: row.loanAlias,
    sponsor: row.sponsor ?? '—',
    defaultDate: formatDate(row.defaultDate),
    maturityDate: formatDate(row.maturityDate),
    interestStatus: row.interestStatus ?? '—',
    units: row.units ?? '—',
    exit: row.exit ?? '—',
    security: row.security ?? null,
    principal: row.principal ?? null,
    osInt: row.osInt ?? null,
    accrued: row.accrued ?? null,
    lateInt: row.lateInt ?? null,
    taxIns: row.taxIns ?? null,
    intAdv: row.intAdv ?? null,
    other: row.other ?? null,
    totalExposure: row.totalExposure ?? null,
    ltv: row.ltv ?? null,
    risk: row.risk ?? 'LOW',
  }));

  const kpis: ManagementSummaryKpis = {
    numberOfLoans: dto.kpis?.numberOfLoans ?? 0,
    totalOutstandingBalance: dto.kpis?.totalOutstandingBalance ?? 0,
    averageLtv: dto.kpis?.averageLtv ?? null,
    percentOfFundings: dto.kpis?.percentOfFundings ?? null,
    averageLtvTrendLabel: dto.kpis?.averageLtvTrendLabel ?? undefined,
    maxLtv: dto.kpis?.maxLtv ?? null,
  };

  const outstanding: OutstandingInterestSummary = {
    interestDisbursed: dto.outstandingInterest?.interestDisbursed ?? 0,
    interestNotDisbursed: dto.outstandingInterest?.interestNotDisbursed ?? 0,
    totalOutstandingInterest: dto.outstandingInterest?.totalOutstandingInterest ?? 0,
    totalLateInterest: dto.outstandingInterest?.totalLateInterest ?? 0,
  };

  const watchlistRows: CmhcWatchlistRow[] = (dto.watchlistRows ?? []).map((row) => ({
    loanId: row.loanId,
    investor: row.investor,
    sponsor: row.sponsor,
    property: row.property,
    missed: parseMissed(row.missed),
    principal: row.principal ?? null,
    osInterest: row.osInterest ?? null,
    taxArrears: row.taxArrears ?? '—',
    ltv: row.ltv ?? '—',
    dscr: row.dscr ?? '—',
    issue: row.issue ?? '—',
    statusUpdate: row.statusUpdate ?? '—',
    conclusion: row.conclusion ?? '—',
    status: row.status ?? 'NO CONCERNS',
  }));

  const ltvRiskBands: LtvRiskBandRow[] = (charts?.ltvRiskDistribution ?? []).map((slice) => ({
    label: slice.label,
    value: slice.value,
    sharePercent: slice.sharePercent ?? 0,
    loans: slice.value,
  }));

  const topExposures: TopExposureRow[] = (charts?.top5Exposures ?? []).map((slice) => ({
    loanAlias: slice.label,
    exposure: slice.value,
    sharePercent: slice.sharePercent ?? 0,
  }));

  const exposureBreakdown = (charts?.exposureBreakdown ?? []).map(mapChartSlice);

  const investorSummary: InvestorSummaryRow[] = (charts?.investorSummary ?? []).map((slice) => ({
    investor: slice.label,
    loans: 0,
    exposure: slice.value,
    sharePercent: slice.sharePercent ?? 0,
  }));

  const sponsorSummary: SponsorSummaryRow[] = (charts?.sponsorSummary ?? []).map((slice) => ({
    sponsor: slice.label,
    exposure: slice.value,
    sharePercent: slice.sharePercent ?? 0,
    ltv: null,
    loanCount: 0,
  }));

  const sponsorOptions = ['All', ...(dto.filterOptions?.sponsors ?? [])];
  const investorAliasOptions = ['All', ...(dto.filterOptions?.investorAliases ?? [])];

  return {
    asOfDisplay: formatAsOfDisplay(dto.asOfDate),
    reportPeriod: dto.reportPeriodLabel || '',
    kpis,
    outstanding,
    loanRows,
    watchlistRows,
    ltvRiskBands,
    topExposures,
    exposureBreakdown,
    capitalStack: [] as ChartSlice[],
    exposureAnalysis: [] as ExposureAnalysisRow[],
    investorSummary,
    sponsorSummary,
    sponsorOptions,
    investorAliasOptions,
  };
}
