import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

/** GET /api/ManagementSummary — one row per loan alias (9 display fields). */
export type ManagementSummaryRowDto = {
  loanAliasKey: number;
  loanAliasName: string;
  ranking: number | null;
  investorAliasName: string;
  loanCount: number;
  totalExposure: number | null;
  securityValue: number | null;
  avgLtv: number | null;
  defaultStatus: string | null;
  defaultDate: string | null;
};

/** GET /api/ManagementSummary/{loanAliasKey}/loan-details — child loan rows (7 display fields). */
export type LoanDetailReportRowDto = {
  loanKey: number;
  parentLoanId: string;
  childLoanId: string;
  description: string;
  investorAliasName: string;
  securityValue: number | null;
  exposure: number | null;
  ltv: number | null;
};

export type ManagementSummaryQuery = {
  loanAliasIds?: number[];
  statuses?: string[];
};

export type ManagementSummaryDashboardQuery = {
  asOfDate: string;
  defaultDateFrom?: string;
  defaultDateTo?: string;
  maturityDateFrom?: string;
  maturityDateTo?: string;
  sponsor?: string;
  riskLevels?: string[];
  statuses?: string[];
  investorAliases?: string[];
  loanAliasIds?: number[];
};

export type ChartSliceDto = {
  label: string;
  value: number;
  sharePercent?: number | null;
  count?: number | null;
  averageLtv?: number | null;
};

export type ManagementSummaryDashboardDto = {
  asOfDate: string;
  reportPeriodLabel: string;
  ltvAsOfDate?: string | null;
  isLtvConfirmed?: boolean;
  kpis: {
    numberOfLoans: number;
    totalOutstandingBalance: number;
    averageLtv?: number | null;
    percentOfFundings?: number | null;
    averageLtvTrendLabel?: string | null;
    maxLtv?: number | null;
  };
  outstandingInterest: {
    interestDisbursed: number;
    interestNotDisbursed: number;
    totalOutstandingInterest: number;
    totalLateInterest: number;
  };
  loanAliasRows: {
    loanAliasKey: number;
    loanAlias: string;
    sponsor?: string | null;
    defaultDate?: string | null;
    maturityDate?: string | null;
    interestStatus?: string | null;
    units?: string | null;
    exit?: string | null;
    security?: number | null;
    principal?: number | null;
    osInt?: number | null;
    accrued?: number | null;
    lateInt?: number | null;
    taxIns?: number | null;
    intAdv?: number | null;
    other?: number | null;
    totalExposure?: number | null;
    ltv?: number | null;
    risk?: string | null;
    isLtvConfirmed?: boolean;
  }[];
  exposureAnalysisRows?: {
    loanAliasKey: number;
    loanAlias: string;
    sponsor: string;
    externalBalance: number;
    smfBalance: number;
    mlpBalance: number;
    totalKsExposure: number;
    subordinateExposure: number;
    ltv?: number | null;
  }[];
  watchlistAsAt?: string | null;
  watchlistRows: {
    loanId: string;
    investor: string;
    sponsor: string;
    property: string;
    missed?: string | number | null;
    principal?: number | null;
    osInterest?: number | null;
    taxArrears?: string | null;
    ltv?: string | null;
    dscr?: string | null;
    issue?: string | null;
    statusUpdate?: string | null;
    conclusion?: string | null;
    status?: string | null;
    reportDate?: string | null;
  }[];
  filterOptions: {
    sponsors?: string[];
    investorAliases?: string[];
    riskLevels?: string[];
    statuses?: string[];
  };
  chartsPhase2: {
    ltvRiskDistribution?: ChartSliceDto[];
    top5Exposures?: ChartSliceDto[];
    exposureBreakdown?: ChartSliceDto[];
    capitalStack?: ChartSliceDto[];
    exposureAnalysis?: ChartSliceDto[];
    investorSummary?: ChartSliceDto[];
    sponsorSummary?: ChartSliceDto[];
  };
};

export type LoanDetailReportDashboardDto = {
  loanAlias: string;
  header: {
    principalBalance?: number | null;
    percentInterestPaid?: number | null;
    overallLtv?: number | null;
  };
  reportDetails: {
    mainLoanId?: string | null;
    loanType?: string | null;
    investorCount?: number | null;
    sponsor?: string | null;
  };
  keyDates: {
    dateOfAdvance?: string | null;
    dateOfDefault?: string | null;
    daysInDefault?: number | null;
    maturityDate?: string | null;
    interestOffDate?: string | null;
    asOfDate?: string | null;
    ltvAsOfDate?: string | null;
    isLtvConfirmed?: boolean;
  };
  propertyStats: {
    securityValue?: number | null;
    unitsSize?: string | null;
    valuePerUnit?: number | null;
    exposurePerUnit?: number | null;
    riskStatus?: string | null;
  };
  interestSummary: {
    interestDisbursed?: number;
    interestNotDisbursed?: number;
    monthsInArrears?: number | null;
  };
  interestOverLife?: {
    totalInterestDue?: number | null;
    paidByReservesOrInterCo?: number | null;
    paidViaCash?: number | null;
    interestUnpaid?: number | null;
  };
  interestReserve: {
    currentInterestReserve?: number | null;
    currentInterestReserveBalance?: number | null;
    monthsCoveredByReserve?: number | null;
  };
  portfolioRows: {
    loanId: string;
    description: string;
    investor: string;
    rank?: number | null;
    rate?: number | null;
    principal?: number | null;
    defInterest?: number | null;
    accruedInt?: number | null;
    lateInt?: number | null;
    intAdj?: number | null;
    taxArrears?: number | null;
    otherCosts?: number | null;
    totalExposure?: number | null;
    ltv?: number | null;
    monthsInArrears?: number | null;
    timesNsfd?: number | null;
    aggregateFlag?: string | null;
    isLtvConfirmed?: boolean;
  }[];
  exposureByInvestor?: ChartSliceDto[];
  exposureComposition?: ChartSliceDto[];
  investorBreakdown?: ChartSliceDto[];
  taxArrearsAsAt?: string | null;
  taxArrearsByYear?: { year: number; taxArrears: number }[];
};

@Injectable({
  providedIn: 'root',
})
export class ManagementSummaryApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/ManagementSummary`;
  }

  getSummary(query: ManagementSummaryQuery = {}) {
    return this.http.get<ManagementSummaryRowDto[]>(this.baseUrl, {
      params: this.buildListParams(query),
    });
  }

  getLoanDetails(loanAliasKey: number, query: ManagementSummaryQuery = {}) {
    return this.http.get<LoanDetailReportRowDto[]>(
      `${this.baseUrl}/${encodeURIComponent(String(loanAliasKey))}/loan-details`,
      { params: this.buildListParams(query) },
    );
  }

  getDashboard(query: ManagementSummaryDashboardQuery) {
    return this.http.get<ManagementSummaryDashboardDto>(`${this.baseUrl}/dashboard`, {
      params: this.buildDashboardParams(query),
    });
  }

  getLoanDetailReport(
    loanAliasKey: number,
    query: {
      asOfDate: string;
      defaultDateFrom?: string;
      defaultDateTo?: string;
      maturityDateFrom?: string;
      maturityDateTo?: string;
      sponsor?: string;
      riskLevels?: string[];
      statuses?: string[];
      investorAliases?: string[];
    },
  ) {
    let params = new HttpParams().set('asOfDate', query.asOfDate);
    if (query.defaultDateFrom) {
      params = params.set('defaultDateFrom', query.defaultDateFrom);
    }
    if (query.defaultDateTo) {
      params = params.set('defaultDateTo', query.defaultDateTo);
    }
    if (query.maturityDateFrom) {
      params = params.set('maturityDateFrom', query.maturityDateFrom);
    }
    if (query.maturityDateTo) {
      params = params.set('maturityDateTo', query.maturityDateTo);
    }
    if (query.sponsor?.trim()) {
      params = params.set('sponsor', query.sponsor.trim());
    }
    for (const level of query.riskLevels ?? []) {
      if (level.trim()) {
        params = params.append('riskLevels', level.trim());
      }
    }
    for (const status of query.statuses ?? []) {
      if (status.trim()) {
        params = params.append('statuses', status.trim());
      }
    }
    for (const alias of query.investorAliases ?? []) {
      if (alias.trim() && alias !== 'All') {
        params = params.append('investorAliases', alias.trim());
      }
    }
    return this.http.get<LoanDetailReportDashboardDto>(
      `${this.baseUrl}/${encodeURIComponent(String(loanAliasKey))}/loan-detail-report`,
      { params },
    );
  }

  private buildDashboardParams(query: ManagementSummaryDashboardQuery): HttpParams {
    let params = new HttpParams().set('asOfDate', query.asOfDate);

    if (query.defaultDateFrom) {
      params = params.set('defaultDateFrom', query.defaultDateFrom);
    }
    if (query.defaultDateTo) {
      params = params.set('defaultDateTo', query.defaultDateTo);
    }
    if (query.maturityDateFrom) {
      params = params.set('maturityDateFrom', query.maturityDateFrom);
    }
    if (query.maturityDateTo) {
      params = params.set('maturityDateTo', query.maturityDateTo);
    }
    if (query.sponsor) {
      params = params.set('sponsor', query.sponsor);
    }
    for (const level of query.riskLevels ?? []) {
      params = params.append('riskLevels', level);
    }
    for (const status of query.statuses ?? []) {
      const trimmed = status.trim();
      if (trimmed && trimmed !== 'All') {
        params = params.append('statuses', trimmed);
      }
    }
    for (const alias of query.investorAliases ?? []) {
      if (alias.trim() && alias !== 'All') {
        params = params.append('investorAliases', alias.trim());
      }
    }
    for (const id of query.loanAliasIds ?? []) {
      params = params.append('loanAliasIds', String(id));
    }

    return params;
  }

  private buildListParams(query: ManagementSummaryQuery): HttpParams {
    let params = new HttpParams();
    for (const id of query.loanAliasIds ?? []) {
      params = params.append('loanAliasIds', String(id));
    }
    for (const status of query.statuses ?? []) {
      params = params.append('statuses', status);
    }
    return params;
  }
}
