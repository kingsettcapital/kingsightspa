import type { LoanDetailReportRowDto } from '../services/management-summary-api.service';
import type {
  LoanDetailReportData,
  LoanPortfolioDetailRow,
} from '../../pages/loan-detail-report/loan-detail-report.models';

const EMPTY_REPORT = (loanAlias: string): LoanDetailReportData => ({
  loanAlias,
  header: {
    principalBalance: 0,
    percentInterestPaid: null,
    overallLtv: 0,
  },
  reportDetails: {
    mainLoanId: '—',
    loanType: '—',
    investorCount: null,
    sponsor: '—',
  },
  keyDates: {
    dateOfAdvance: '—',
    dateOfDefault: '—',
    maturityDate: '—',
    interestOffDate: '—',
    daysInDefault: 0,
    asOfDate: new Date().toISOString().slice(0, 10),
  },
  propertyStats: {
    securityValue: 0,
    unitsSize: '—',
    valuePerUnit: 0,
    exposurePerUnit: 0,
    riskStatus: '—',
  },
  interestSummary: {
    interestDisbursed: 0,
    interestNotDisbursed: 0,
    monthsInArrears: 0,
  },
  interestOverLife: {
    totalInterestDue: null,
    paidByReservesOrInterCo: null,
    paidViaCash: null,
    interestUnpaid: null,
  },
  interestReserve: {
    currentInterestReserve: 0,
    currentInterestReserveBalance: 0,
    monthsCoveredByReserve: 0,
  },
  portfolioRows: [],
  exposureByInvestor: [],
  exposureComposition: [],
  investorBreakdown: [],
  taxArrearsAsAt: '—',
  taxArrearsByYear: [],
});

export function mapApiRowToPortfolioDetail(row: LoanDetailReportRowDto): LoanPortfolioDetailRow {
  return {
    loanId: row.childLoanId || row.parentLoanId,
    description: row.description,
    investor: row.investorAliasName ?? '—',
    rank: '—',
    rate: null,
    principal: row.exposure,
    defInterest: null,
    accruedInt: null,
    lateInt: null,
    intAdj: null,
    taxArrears: null,
    otherCosts: null,
    totalExposure: row.exposure,
    ltv: row.ltv,
    monthsInArrears: null,
    timesNsfd: null,
  };
}

export function buildLoanDetailReport(
  loanAlias: string,
  rows: LoanDetailReportRowDto[],
): LoanDetailReportData {
  const report = EMPTY_REPORT(loanAlias);
  if (!rows.length) {
    return report;
  }

  const portfolioRows = rows.map(mapApiRowToPortfolioDetail);
  const totalExposure = rows.reduce((sum, row) => sum + (row.exposure ?? 0), 0);
  const totalSecurity = rows.reduce((sum, row) => sum + (row.securityValue ?? 0), 0);
  const ltvRows = rows.filter((row) => row.ltv != null);
  const overallLtv =
    ltvRows.length > 0
      ? ltvRows.reduce((sum, row) => sum + (row.ltv ?? 0), 0) / ltvRows.length
      : 0;

  const byInvestor = new Map<string, number>();
  for (const row of rows) {
    const investor = row.investorAliasName?.trim() || 'Unassigned';
    byInvestor.set(investor, (byInvestor.get(investor) ?? 0) + (row.exposure ?? 0));
  }
  const investorSlices = [...byInvestor.entries()].map(([label, value]) => ({
    label,
    value,
    sharePercent: totalExposure > 0 ? (value / totalExposure) * 100 : 0,
  }));

  report.header = {
    principalBalance: totalExposure,
    percentInterestPaid: null,
    overallLtv,
  };
  report.reportDetails = {
    mainLoanId: rows[0].parentLoanId,
    loanType: '—',
    investorCount: byInvestor.size,
    sponsor: '—',
  };
  report.portfolioRows = portfolioRows;
  report.exposureByInvestor = investorSlices;
  report.investorBreakdown = investorSlices;
  report.exposureComposition = investorSlices;

  return report;
}
