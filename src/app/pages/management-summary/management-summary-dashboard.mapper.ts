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
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

function buildCapitalStackFromExposureAnalysis(
  rows: ManagementSummaryDashboardDto['exposureAnalysisRows'],
): Array<{ label: string; value: number; sharePercent: number }> {
  const source = rows ?? [];
  const external = source.reduce((sum, row) => sum + (row.externalBalance ?? 0), 0);
  const smf = source.reduce((sum, row) => sum + (row.smfBalance ?? 0), 0);
  const mlp = source.reduce((sum, row) => sum + (row.mlpBalance ?? 0), 0);
  const subordinate = source.reduce((sum, row) => sum + (row.subordinateExposure ?? 0), 0);
  const total = external + smf + mlp + subordinate;
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

  return [
    { label: 'External', value: external, sharePercent: pct(external) },
    { label: 'SMF', value: smf, sharePercent: pct(smf) },
    { label: 'MLP', value: mlp, sharePercent: pct(mlp) },
    { label: 'Subordinate Exposure', value: subordinate, sharePercent: pct(subordinate) },
  ].filter((slice) => slice.value !== 0);
}

function mapWatchlistStatus(status: string | null | undefined): string {
  if (!status?.trim()) {
    return 'NO CONCERNS';
  }
  const value = status.trim();
  const lower = value.toLowerCase();
  if (lower.includes('yellow') || lower === 'y') {
    return 'CONCERN';
  }
  if (lower.includes('green') || lower === 'g') {
    return 'NO CONCERNS';
  }
  if (lower.includes('orange') || lower.includes('red') || lower === 'r') {
    return 'CLAIM EXPECTED';
  }
  if (lower.includes('claim')) {
    return 'CLAIM EXPECTED';
  }
  if (lower.includes('no concern')) {
    return 'NO CONCERNS';
  }
  if (lower.includes('concern')) {
    return 'CONCERN';
  }
  return value.toUpperCase();
}

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : '—';
}

function extractCommentSection(text: string, label: string): string | null {
  const pattern = new RegExp(
    `${label}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:Issue|Status Update|Next Steps|Conclusion):|$)`,
    'i',
  );
  const match = text.match(pattern);
  const value = match?.[1]?.trim();
  return value ? value : null;
}

function splitWatchlistComments(text: string | null | undefined): {
  issue: string;
  statusUpdate: string;
  conclusion: string;
} {
  if (!text?.trim()) {
    return { issue: '—', statusUpdate: '—', conclusion: '—' };
  }

  const issue = extractCommentSection(text, 'Issue');
  const statusUpdate =
    extractCommentSection(text, 'Status Update') ?? extractCommentSection(text, 'Next Steps');
  const conclusion = extractCommentSection(text, 'Conclusion');

  if (!issue && !statusUpdate && !conclusion) {
    return { issue: text.trim(), statusUpdate: '—', conclusion: '—' };
  }

  return {
    issue: issue ?? '—',
    statusUpdate: statusUpdate ?? '—',
    conclusion: conclusion ?? '—',
  };
}

function dedupeWatchlistRows(
  rows: ManagementSummaryDashboardDto['watchlistRows'],
): ManagementSummaryDashboardDto['watchlistRows'] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.loanId ?? ''}|${row.investor ?? ''}|${row.reportDate ?? ''}|${row.property ?? ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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

  const watchlistRows: CmhcWatchlistRow[] = dedupeWatchlistRows(dto.watchlistRows ?? []).map((row) => {
    const comments = splitWatchlistComments(row.issue);
    return {
      loanId: displayText(row.loanId),
      investor: displayText(row.investor),
      sponsor: displayText(row.sponsor),
      property: displayText(row.property),
      missed: row.missed == null || String(row.missed).trim() === '' ? '—' : row.missed,
      principal: row.principal ?? null,
      osInterest: row.osInterest ?? null,
      taxArrears: displayText(row.taxArrears),
      ltv: displayText(row.ltv),
      dscr: displayText(row.dscr),
      issue: row.statusUpdate || row.conclusion ? displayText(row.issue) : comments.issue,
      statusUpdate: row.statusUpdate ? displayText(row.statusUpdate) : comments.statusUpdate,
      conclusion: row.conclusion ? displayText(row.conclusion) : comments.conclusion,
      status: mapWatchlistStatus(row.status),
    };
  });

  const ltvRiskBands: LtvRiskBandRow[] = (charts?.ltvRiskDistribution ?? []).map((slice) => ({
    label: slice.label,
    value: slice.value,
    sharePercent: slice.sharePercent ?? 0,
    loans: slice.count ?? 0,
  }));

  const topExposures: TopExposureRow[] = (charts?.top5Exposures ?? []).map((slice) => ({
    loanAlias: slice.label,
    exposure: slice.value,
    sharePercent: slice.sharePercent ?? 0,
  }));

  const exposureBreakdown = (charts?.exposureBreakdown ?? []).map(mapChartSlice);

  const capitalStack = (charts?.capitalStack?.length
    ? charts.capitalStack
    : buildCapitalStackFromExposureAnalysis(dto.exposureAnalysisRows ?? [])
  ).map(mapChartSlice);

  const investorSummary: InvestorSummaryRow[] = (charts?.investorSummary ?? [])
    .filter((slice) => slice.value > 0)
    .filter((slice) => {
      const label = (slice.label ?? '').trim();
      return label.length > 0
        && label.toLowerCase() !== '(unknown)'
        && label.toLowerCase() !== 'unknown';
    })
    .map((slice) => ({
      investor: slice.label,
      loans: slice.count ?? 0,
      exposure: slice.value,
      sharePercent: slice.sharePercent ?? 0,
    }));

  const investorTotal = investorSummary.reduce((sum, row) => sum + row.exposure, 0);
  if (investorTotal > 0) {
    for (const row of investorSummary) {
      row.sharePercent = Math.round((row.exposure / investorTotal) * 1000) / 10;
    }
  }

  const sponsorSummary: SponsorSummaryRow[] = (charts?.sponsorSummary ?? [])
    .filter((slice) => slice.value > 0)
    .map((slice) => ({
      sponsor: slice.label,
      exposure: slice.value,
      sharePercent: slice.sharePercent ?? 0,
      ltv: slice.averageLtv ?? null,
      loanCount: slice.count ?? 0,
    }));

  const exposureAnalysis: ExposureAnalysisRow[] = (dto.exposureAnalysisRows ?? []).map((row) => ({
    loanAliasKey: row.loanAliasKey,
    loanAlias: row.loanAlias,
    sponsor: row.sponsor || '—',
    externalBalance: row.externalBalance ?? 0,
    rmfBalance: row.smfBalance ?? 0,
    mlpBalance: row.mlpBalance ?? 0,
    totalKsExposure: row.totalKsExposure ?? 0,
    subordinateExposure: row.subordinateExposure ?? 0,
  }));

  const sponsorOptions = ['All', ...(dto.filterOptions?.sponsors ?? []).filter((s) => s !== 'All')];
  const investorAliasOptions = [
    'All',
    ...(dto.filterOptions?.investorAliases ?? []).filter((s) => s !== 'All'),
  ];
  const statusOptions = (() => {
    const fromApi = (dto.filterOptions?.statuses ?? []).filter((s) => !!s?.trim());
    if (fromApi.length === 0) {
      return ['Default', 'All'];
    }
    const withoutAll = fromApi.filter((s) => s.toLowerCase() !== 'all');
    const hasAll = fromApi.some((s) => s.toLowerCase() === 'all');
    return hasAll ? [...withoutAll, 'All'] : [...withoutAll, 'All'];
  })();

  return {
    asOfDisplay: formatAsOfDisplay(dto.asOfDate),
    reportPeriod: dto.reportPeriodLabel || '',
    kpis,
    outstanding,
    loanRows,
    watchlistRows,
    watchlistAsAt: dto.watchlistAsAt
      ? formatAsOfDisplay(String(dto.watchlistAsAt).slice(0, 10))
      : '—',
    ltvRiskBands,
    topExposures,
    exposureBreakdown,
    capitalStack,
    exposureAnalysis,
    investorSummary,
    sponsorSummary,
    sponsorOptions,
    investorAliasOptions,
    statusOptions,
  };
}
