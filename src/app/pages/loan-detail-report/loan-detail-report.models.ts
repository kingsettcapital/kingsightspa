export type LoanDetailHeaderSummary = {
  principalBalance: number;
  percentInterestPaid: number | null;
  overallLtv: number;
};

export type LoanDetailReportDetails = {
  mainLoanId: string;
  investorCount: number | null;
  sponsor: string;
};

export type LoanDetailKeyDates = {
  dateOfAdvance: string;
  dateOfDefault: string;
  maturityDate: string;
  interestOffDate: string;
  daysInDefault: number;
  /** Report as-of date (header only; not shown in Key Dates box). */
  asOfDate: string;
};

export type LoanDetailPropertyStats = {
  securityValue: number;
  unitsSize: string;
  valuePerUnit: number;
  exposurePerUnit: number;
  riskStatus: 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW' | string;
};

export type LoanDetailInterestSummary = {
  interestDisbursed: number;
  interestNotDisbursed: number;
  monthsInArrears: number;
};

export type LoanDetailInterestOverLife = {
  totalInterestDue: number | null;
  paidByReservesOrInterCo: number | null;
  paidViaCash: number | null;
  interestUnpaid: number | null;
};

export type LoanDetailInterestReserve = {
  currentInterestReserve: number;
  currentInterestReserveBalance: number;
  monthsCoveredByReserve: number;
};

export type LoanPortfolioDetailRow = {
  loanId: string;
  description: string;
  investor: string;
  rank: string;
  rate: number | null;
  principal: number | null;
  defInterest: number | null;
  accruedInt: number | null;
  lateInt: number | null;
  intAdj: number | null;
  taxArrears: number | null;
  otherCosts: number | null;
  totalExposure: number | null;
  ltv: number | null;
  monthsInArrears: number | null;
  timesNsfd: number | null;
  /** Y/N (aggregate_flag); TOTALS only include Y rows. Grid still shows all rows. */
  aggregateFlag: string | null;
};

export type LoanDetailChartSlice = {
  label: string;
  value: number;
  sharePercent: number;
};

export type LoanDetailTaxArrearsRow = {
  year: number;
  taxArrears: number;
};

export type LoanDetailReportData = {
  loanAlias: string;
  header: LoanDetailHeaderSummary;
  reportDetails: LoanDetailReportDetails;
  keyDates: LoanDetailKeyDates;
  propertyStats: LoanDetailPropertyStats;
  interestSummary: LoanDetailInterestSummary;
  interestOverLife: LoanDetailInterestOverLife;
  interestReserve: LoanDetailInterestReserve;
  portfolioRows: LoanPortfolioDetailRow[];
  exposureByInvestor: LoanDetailChartSlice[];
  exposureComposition: LoanDetailChartSlice[];
  investorBreakdown: LoanDetailChartSlice[];
  taxArrearsAsAt: string;
  taxArrearsByYear: LoanDetailTaxArrearsRow[];
};
