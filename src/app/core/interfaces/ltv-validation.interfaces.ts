export type LtvValidationRow = {
  recordKey: string;
  parentLoanId: string;
  childLoanId: string;
  loanDescription: string;
  loanAlias: string;
  investorAlias: string;
  securityValue: number | null;
  exposure: number;
  ranking: number;
  ltv: number | null;
  aiCommentary: string;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type LtvValidationRowSnapshot = {
  securityValue: number | null;
  ltv: number | null;
};

export type LtvValidationApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type LtvValidationUpdatePayload = {
  recordKey: string;
  childLoanId: string;
  securityValue: number | null;
  ltv: number | null;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type LtvValidationBulkUpdateRequest = {
  records: LtvValidationUpdatePayload[];
  pushToYardi?: boolean;
};

export type MainLoanSelectOption = {
  value: string;
  label: string;
  loanAlias: string;
};
