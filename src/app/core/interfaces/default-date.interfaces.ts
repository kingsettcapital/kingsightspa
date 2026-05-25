export type DefaultDateRow = {
  loanKey: string;
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  loanTermDefaultDate: string;
  defaultDate: string;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type DefaultDateRowSnapshot = {
  defaultDate: string;
};

export type DefaultDateApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type DefaultDateUpdatePayload = {
  loanKey: string;
  defaultDate: string;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type DefaultDateBulkUpdateRequest = {
  loans: DefaultDateUpdatePayload[];
  pushToYardi?: boolean;
};
