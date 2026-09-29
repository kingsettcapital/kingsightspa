export type DefaultSubjectiveAnalyticsRow = {
  loanKey: string;
  loanId: string;
  loanDescription: string;
  loanAlias: string;
  maturityDate: string;
  defaultStatus: string;
  exitPlan: string;
  exitDate: string;
  maturityAdditionalDetail: string;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type DefaultSubjectiveAnalyticsRowSnapshot = {
  defaultStatus: string;
  exitPlan: string;
  exitDate: string;
  maturityAdditionalDetail: string;
};

export type DefaultSubjectiveAnalyticsApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type DefaultSubjectiveAnalyticsUpdatePayload = {
  loanKey: string;
  defaultStatus: string;
  exitPlan: string;
  exitDate: string;
  maturityAdditionalDetail: string;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type DefaultSubjectiveAnalyticsBulkUpdateRequest = {
  loans: DefaultSubjectiveAnalyticsUpdatePayload[];
  pushToYardi?: boolean;
};
