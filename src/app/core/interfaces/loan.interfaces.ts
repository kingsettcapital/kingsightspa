export interface LoanApiRecord {
  [key: string]: string | number | boolean | null | undefined;
}

/** Mirrors GET /api/Loans — aligned with InvestorDto (loanDesc ↔ investorName). */
export interface LoanDto {
  loanKey: number;
  loanCode: string;
  loanDesc?: string | null;
  loanAliasKey?: number | null;
  loanAliasName?: string | null;
  investorName?: string | null;
  loanRanking?: number | null;
  dummyLoanLink?: string | null;
  isLoanInterestApplicable?: boolean | null;
  lateInterestOffNote?: string | null;
  userUpdatedBy?: string | null;
  userUpdatedDate?: string | null;
}

export interface LoanUpdatePayload {
  loanKey: number;
  loanAliasKey: number;
  userUpdatedBy: string;
}

export interface LoanBulkUpdateRequest {
  loans: LoanUpdatePayload[];
}
