import type { ManagementSummaryRowDto } from '../services/management-summary-api.service';
import type {
  ChartSlice,
  ExposureAnalysisRow,
  InvestorSummaryRow,
  LoanAliasSummaryRow,
  LtvRiskBandRow,
  ManagementSummaryKpis,
  SponsorSummaryRow,
  TopExposureRow,
} from '../../pages/management-summary/management-summary.models';

function riskFromLtv(ltv: number | null): LoanAliasSummaryRow['risk'] {
  if (ltv == null) {
    return '—';
  }
  if (ltv > 100) {
    return 'HIGH';
  }
  if (ltv >= 90) {
    return 'ELEVATED';
  }
  if (ltv >= 75) {
    return 'MODERATE';
  }
  return 'LOW';
}

export function mapApiRowToLoanAliasSummary(row: ManagementSummaryRowDto): LoanAliasSummaryRow {
  return {
    loanAliasKey: row.loanAliasKey,
    loanAlias: row.loanAliasName,
    sponsor: '—',
    defaultDate: row.defaultDate ?? '',
    maturityDate: '',
    interestStatus: row.defaultStatus ?? '—',
    units: row.loanCount > 0 ? `Loans: ${row.loanCount}` : '—',
    exit: '—',
    security: row.securityValue,
    principal: null,
    osInt: null,
    accrued: null,
    lateInt: null,
    taxIns: null,
    intAdv: null,
    other: null,
    totalExposure: row.totalExposure,
    ltv: row.avgLtv,
    risk: riskFromLtv(row.avgLtv),
  };
}

export function buildKpisFromSummaryRows(rows: ManagementSummaryRowDto[]): ManagementSummaryKpis {
  const totalExposure = rows.reduce((sum, row) => sum + (row.totalExposure ?? 0), 0);
  const loanCount = rows.reduce((sum, row) => sum + (row.loanCount ?? 0), 0);
  const ltvRows = rows.filter((row) => row.avgLtv != null && row.totalExposure != null);
  const averageLtv =
    ltvRows.length > 0
      ? ltvRows.reduce((sum, row) => sum + (row.avgLtv ?? 0), 0) / ltvRows.length
      : null;
  const maxLtv = rows.reduce<number | null>((max, row) => {
    if (row.avgLtv == null) {
      return max;
    }
    return max == null ? row.avgLtv : Math.max(max, row.avgLtv);
  }, null);

  return {
    numberOfLoans: loanCount,
    totalOutstandingBalance: totalExposure,
    averageLtv,
    percentOfFundings: null,
    maxLtv,
  };
}

export function buildTopExposures(rows: ManagementSummaryRowDto[]): TopExposureRow[] {
  const total = rows.reduce((sum, row) => sum + (row.totalExposure ?? 0), 0);
  return [...rows]
    .filter((row) => (row.totalExposure ?? 0) > 0)
    .sort((a, b) => (b.totalExposure ?? 0) - (a.totalExposure ?? 0))
    .slice(0, 5)
    .map((row) => ({
      loanAlias: row.loanAliasName,
      exposure: row.totalExposure ?? 0,
      sharePercent: total > 0 ? ((row.totalExposure ?? 0) / total) * 100 : 0,
    }));
}

function toChartSlices(
  entries: { label: string; value: number }[],
): ChartSlice[] {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.value,
    sharePercent: total > 0 ? (entry.value / total) * 100 : 0,
  }));
}

export function buildInvestorSummary(rows: ManagementSummaryRowDto[]): InvestorSummaryRow[] {
  const byInvestor = new Map<string, { loans: number; exposure: number }>();
  for (const row of rows) {
    const investor = row.investorAliasName?.trim() || 'Unassigned';
    const current = byInvestor.get(investor) ?? { loans: 0, exposure: 0 };
    current.loans += row.loanCount ?? 0;
    current.exposure += row.totalExposure ?? 0;
    byInvestor.set(investor, current);
  }
  const total = [...byInvestor.values()].reduce((sum, item) => sum + item.exposure, 0);
  return [...byInvestor.entries()]
    .map(([investor, item]) => ({
      investor,
      loans: item.loans,
      exposure: item.exposure,
      sharePercent: total > 0 ? (item.exposure / total) * 100 : 0,
    }))
    .sort((a, b) => b.exposure - a.exposure);
}

export function buildSponsorSummary(rows: LoanAliasSummaryRow[]): SponsorSummaryRow[] {
  const total = rows.reduce((sum, row) => sum + (row.totalExposure ?? 0), 0);
  return rows
    .filter((row) => (row.totalExposure ?? 0) > 0)
    .map((row) => ({
      sponsor: row.loanAlias,
      exposure: row.totalExposure ?? 0,
      sharePercent: total > 0 ? ((row.totalExposure ?? 0) / total) * 100 : 0,
      ltv: row.ltv,
      loanCount: 1,
    }))
    .sort((a, b) => b.exposure - a.exposure)
    .slice(0, 8);
}

export function buildLtvRiskBands(rows: LoanAliasSummaryRow[]): LtvRiskBandRow[] {
  const bands: { label: string; min: number; max: number }[] = [
    { label: '>100%', min: 100.01, max: Infinity },
    { label: '90–100%', min: 90, max: 100 },
    { label: '75–90%', min: 75, max: 89.99 },
    { label: '<75%', min: 0, max: 74.99 },
  ];
  const entries = bands.map((band) => {
    const matching = rows.filter((row) => {
      const ltv = row.ltv;
      return ltv != null && ltv >= band.min && ltv <= band.max;
    });
    return {
      label: band.label,
      value: matching.reduce((sum, row) => sum + (row.totalExposure ?? 0), 0),
      loans: matching.length,
    };
  });
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.value,
    sharePercent: total > 0 ? (entry.value / total) * 100 : 0,
    loans: entry.loans,
  }));
}

export function buildExposureBreakdown(rows: LoanAliasSummaryRow[]): ChartSlice[] {
  return toChartSlices(
    rows
      .filter((row) => (row.totalExposure ?? 0) > 0)
      .map((row) => ({ label: row.loanAlias, value: row.totalExposure ?? 0 })),
  );
}

export function buildExposureAnalysis(rows: LoanAliasSummaryRow[]): ExposureAnalysisRow[] {
  return rows.map((row) => ({
    loanAliasKey: row.loanAliasKey,
    loanAlias: row.loanAlias,
    sponsor: row.sponsor,
    externalBalance: 0,
    rmfBalance: 0,
    mlpBalance: 0,
    totalKsExposure: row.totalExposure ?? 0,
    subordinateExposure: 0,
  }));
}
