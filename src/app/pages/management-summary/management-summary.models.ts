export type ManagementSummaryKpis = {
  numberOfLoans: number;
  totalOutstandingBalance: number;
  averageLtv: number | null;
  percentOfFundings: number | null;
  averageLtvTrendLabel?: string;
  maxLtv?: number | null;
};

export type OutstandingInterestSummary = {
  interestDisbursed: number;
  interestNotDisbursed: number;
  totalOutstandingInterest: number;
  totalLateInterest: number;
};

export type LoanAliasSummaryRow = {
  loanAliasKey: number;
  loanAlias: string;
  sponsor: string;
  defaultDate: string;
  maturityDate: string;
  interestStatus: string;
  units: string;
  exit: string;
  security: number | null;
  principal: number | null;
  osInt: number | null;
  accrued: number | null;
  lateInt: number | null;
  taxIns: number | null;
  intAdv: number | null;
  other: number | null;
  totalExposure: number | null;
  ltv: number | null;
  risk: 'HIGH' | 'ELEVATED' | 'MODERATE' | 'LOW' | string;
};

export type CmhcWatchlistRow = {
  loanId: string;
  investor: string;
  sponsor: string;
  property: string;
  missed: string | number | null;
  principal: number | null;
  osInterest: number | null;
  taxArrears: string;
  ltv: string;
  dscr: string;
  issue: string;
  statusUpdate: string;
  conclusion: string;
  status: 'CONCERN' | 'NO CONCERNS' | 'CLAIM EXPECTED' | string;
};

export type ManagementSummaryFilters = {
  asOfDate: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  maturityDateFrom: string;
  maturityDateTo: string;
  sponsor: string;
  riskLevels: string[];
  status: string;
  investorAliases: string[];
};

export type ChartSlice = {
  label: string;
  value: number;
  sharePercent: number;
};

export type LtvRiskBandRow = ChartSlice & {
  loans: number;
};

export type TopExposureRow = {
  loanAlias: string;
  exposure: number;
  sharePercent: number;
};

export type ExposureAnalysisRow = {
  loanAliasKey: number;
  loanAlias: string;
  sponsor: string;
  externalBalance: number;
  rmfBalance: number;
  mlpBalance: number;
  totalKsExposure: number;
  subordinateExposure: number;
};

export type InvestorSummaryRow = {
  investor: string;
  loans: number;
  exposure: number;
  sharePercent: number;
};

export type SponsorSummaryRow = {
  sponsor: string;
  exposure: number;
  sharePercent: number;
  ltv: number | null;
  loanCount: number;
};

export type LoanAliasSummaryTotals = {
  security: number;
  principal: number;
  osInt: number;
  accrued: number;
  lateInt: number;
  taxIns: number;
  intAdv: number;
  other: number;
  totalExposure: number;
  ltv: number | null;
};
