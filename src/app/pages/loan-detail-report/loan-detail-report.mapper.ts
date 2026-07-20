import type { LoanDetailReportData } from './loan-detail-report.models';
import type { LoanDetailReportDashboardDto } from '../../core/services/management-summary-api.service';

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

function mapChartSlice(slice: {
  label: string;
  value: number;
  sharePercent?: number | null;
}) {
  return {
    label: slice.label,
    value: slice.value,
    sharePercent: slice.sharePercent ?? 0,
  };
}

export function mapLoanDetailReportDashboard(dto: LoanDetailReportDashboardDto): LoanDetailReportData {
  return {
    loanAlias: dto.loanAlias,
    header: {
      securityValue: dto.header?.securityValue ?? 0,
      overallLtv: dto.header?.overallLtv ?? 0,
      equityCushion: dto.header?.equityCushion ?? 0,
      units: Number(dto.header?.units) || 0,
    },
    reportDetails: {
      mainLoanId: dto.reportDetails?.mainLoanId ?? '—',
      loanType: dto.reportDetails?.loanType ?? '—',
      investorAlias: dto.reportDetails?.investorAlias ?? '—',
      ranking: dto.reportDetails?.ranking != null ? String(dto.reportDetails.ranking) : '—',
    },
    keyDates: {
      dateOfDefault: formatDate(dto.keyDates?.dateOfDefault),
      daysInDefault: dto.keyDates?.daysInDefault ?? 0,
      maturityDate: formatDate(dto.keyDates?.maturityDate),
      asOfDate: formatDate(dto.keyDates?.asOfDate),
    },
    propertyStats: {
      valuePerUnit: dto.propertyStats?.valuePerUnit ?? 0,
      riskStatus: dto.propertyStats?.riskStatus ?? '—',
      propertyType: dto.propertyStats?.propertyType ?? '—',
      location: dto.propertyStats?.location ?? '—',
    },
    interestSummary: {
      interestDisbursed: dto.interestSummary?.interestDisbursed ?? 0,
      interestNotDisbursed: dto.interestSummary?.interestNotDisbursed ?? 0,
      totalOutstandingInterest: dto.interestSummary?.totalOutstandingInterest ?? 0,
      monthsInArrears: dto.interestSummary?.monthsInArrears ?? 0,
    },
    interestReserve: {
      currentInterestReserve: dto.interestReserve?.currentInterestReserve ?? 0,
      currentInterestReserveBalance: dto.interestReserve?.currentInterestReserveBalance ?? 0,
      monthsCoveredByReserve: dto.interestReserve?.monthsCoveredByReserve ?? 0,
    },
    portfolioRows: (dto.portfolioRows ?? []).map((row) => ({
      loanId: row.loanId,
      description: row.description,
      investor: row.investor,
      rank: row.rank != null ? String(row.rank) : '—',
      rate: row.rate ?? null,
      principal: row.principal ?? null,
      defInterest: row.defInterest ?? null,
      accruedInt: row.accruedInt ?? null,
      lateInt: row.lateInt ?? null,
      intAdj: row.intAdj ?? null,
      taxArrears: row.taxArrears ?? null,
      otherCosts: row.otherCosts ?? null,
      totalExposure: row.totalExposure ?? null,
      ltv: row.ltv ?? null,
      monthsInArrears: row.monthsInArrears ?? null,
      timesNsfd: row.timesNsfd ?? null,
    })),
    exposureByInvestor: (dto.exposureByInvestor ?? []).map(mapChartSlice),
    exposureComposition: (dto.exposureComposition ?? []).map(mapChartSlice),
    investorBreakdown: (dto.investorBreakdown ?? []).map(mapChartSlice),
    taxArrearsAsAt: formatDate(dto.taxArrearsAsAt),
    taxArrearsByYear: (dto.taxArrearsByYear ?? []).map((row) => ({
      year: row.year,
      taxArrears: row.taxArrears,
    })),
  };
}
