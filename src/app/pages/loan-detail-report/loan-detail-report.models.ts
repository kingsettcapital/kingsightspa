export type LoanDetailHeaderSummary = {
  securityValue: number;
  overallLtv: number;
  equityCushion: number;
  units: number;
};

export type LoanDetailReportDetails = {
  mainLoanId: string;
  loanType: string;
  investorAlias: string;
  ranking: string;
};

export type LoanDetailKeyDates = {
  dateOfDefault: string;
  daysInDefault: number;
  maturityDate: string;
  asOfDate: string;
};

export type LoanDetailPropertyStats = {
  valuePerUnit: number;
  riskStatus: 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW' | string;
  propertyType: string;
  location: string;
};

export type LoanDetailInterestSummary = {
  interestDisbursed: number;
  interestNotDisbursed: number;
  totalOutstandingInterest: number;
  monthsInArrears: number;
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
  interestReserve: LoanDetailInterestReserve;
  portfolioRows: LoanPortfolioDetailRow[];
  exposureByInvestor: LoanDetailChartSlice[];
  exposureComposition: LoanDetailChartSlice[];
  investorBreakdown: LoanDetailChartSlice[];
  taxArrearsAsAt: string;
  taxArrearsByYear: LoanDetailTaxArrearsRow[];
};
