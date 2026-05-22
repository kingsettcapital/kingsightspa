export type SecurityValueRow = {
  loanKey: string;
  loanAlias: string;
  collateralPerYardi: number;
  securityValue: number | null;
  securityValueOverridden: boolean;
  fundingStatus: string;
  dateDwhUpdate: string;
  updatedBy: string;
};

export type SecurityValueRowSnapshot = {
  securityValue: number | null;
  securityValueOverridden: boolean;
};

export type SecurityValueApiRecord = {
  [key: string]: string | number | boolean | null | undefined;
};

export type SecurityValueUpdatePayload = {
  loanKey: string;
  securityValue: number;
  securityValueOverridden: boolean;
  userUpdatedDate: string;
  userUpdatedBy: string;
};

export type SecurityValueBulkUpdateRequest = {
  loans: SecurityValueUpdatePayload[];
  pushToYardi?: boolean;
};
