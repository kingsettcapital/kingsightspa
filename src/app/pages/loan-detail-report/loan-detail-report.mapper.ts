import type { LoanDetailReportData } from './loan-detail-report.models';
import type { LoanDetailReportDashboardDto } from '../../core/services/management-summary-api.service';

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAsOfDisplay(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
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
      principalBalance: dto.header?.principalBalance ?? 0,
      percentInterestPaid: dto.header?.percentInterestPaid ?? null,
      overallLtv: dto.header?.overallLtv ?? 0,
    },
    reportDetails: {
      mainLoanId: dto.reportDetails?.mainLoanId ?? '—',
      investorCount: dto.reportDetails?.investorCount ?? null,
      sponsor: dto.reportDetails?.sponsor?.trim() || '—',
    },
    keyDates: {
      dateOfAdvance: formatDate(dto.keyDates?.dateOfAdvance),
      dateOfDefault: formatDate(dto.keyDates?.dateOfDefault),
      maturityDate: formatDate(dto.keyDates?.maturityDate),
      interestOffDate: formatDate(dto.keyDates?.interestOffDate),
      daysInDefault: dto.keyDates?.daysInDefault ?? 0,
      asOfDate: formatAsOfDisplay(dto.keyDates?.asOfDate),
    },
    propertyStats: {
      securityValue: dto.propertyStats?.securityValue ?? 0,
      unitsSize: dto.propertyStats?.unitsSize?.trim() || '—',
      valuePerUnit: dto.propertyStats?.valuePerUnit ?? 0,
      exposurePerUnit: dto.propertyStats?.exposurePerUnit ?? 0,
      riskStatus: dto.propertyStats?.riskStatus ?? '—',
    },
    interestSummary: {
      interestDisbursed: dto.interestSummary?.interestDisbursed ?? 0,
      interestNotDisbursed: dto.interestSummary?.interestNotDisbursed ?? 0,
      monthsInArrears: dto.interestSummary?.monthsInArrears ?? 0,
    },
    interestOverLife: {
      totalInterestDue: dto.interestOverLife?.totalInterestDue ?? null,
      paidByReservesOrInterCo: dto.interestOverLife?.paidByReservesOrInterCo ?? null,
      paidViaCash: dto.interestOverLife?.paidViaCash ?? null,
      interestUnpaid: dto.interestOverLife?.interestUnpaid ?? null,
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
      aggregateFlag: row.aggregateFlag ?? null,
    })),
    exposureByInvestor: (dto.exposureByInvestor ?? []).map(mapChartSlice),
    exposureComposition: (dto.exposureComposition ?? []).map(mapChartSlice),
    investorBreakdown: (dto.investorBreakdown ?? []).map(mapChartSlice),
    taxArrearsAsAt: formatAsOfDisplay(dto.taxArrearsAsAt),
    taxArrearsByYear: (dto.taxArrearsByYear ?? []).map((row) => ({
      year: row.year,
      taxArrears: row.taxArrears,
    })),
  };
}
