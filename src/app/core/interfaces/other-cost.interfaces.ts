export type OtherCostRow = {
  loanKey: string;
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  outstandingInvoices: number;
  estRealizationCosts: number;
  costToComplete: number;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type OtherCostRowSnapshot = {
  outstandingInvoices: number;
  estRealizationCosts: number;
  costToComplete: number;
};

export type OtherCostApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type OtherCostUpdatePayload = {
  loanKey: string;
  outstandingInvoices: number;
  estRealizationCosts: number;
  costToComplete: number;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type OtherCostBulkUpdateRequest = {
  loans: OtherCostUpdatePayload[];
  pushToYardi?: boolean;
};
