export type TaxArrearsRow = {
  recordKey: string;
  loanKey: string;
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  taxMemoDate: string;
  taxArrears: number;
  taxYear: string;
  notes: string;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type TaxArrearsRowSnapshot = {
  taxMemoDate: string;
  taxArrears: number;
  taxYear: string;
  notes: string;
};

export type TaxArrearsApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type TaxArrearsUpdatePayload = {
  recordKey: string;
  loanKey: string;
  taxMemoDate: string;
  taxArrears: number;
  taxYear: string;
  notes: string;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type TaxArrearsBulkUpdateRequest = {
  records: TaxArrearsUpdatePayload[];
  pushToYardi?: boolean;
};

export type TaxArrearsAddRecordPayload = {
  loanAlias: string;
  taxMemoDate: string;
  loanId: string;
  loanDescription: string;
  syndicateId: string;
  syndicateDescription: string;
  taxYear: string;
  taxArrears: number;
  notes: string;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type TaxArrearsLoanLookup = {
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  loanKey: string;
};
