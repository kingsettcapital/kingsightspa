export interface InvestorAliasRow {
  investor_key: number;
  investor_code: string;
  investor_name: string;
  investor_alias_name: string;
  user_updated_by: string | null;
  user_updated_date: string | null;
}

export interface InvestorAliasUpdatePayload {
  investor_key: number;
  investor_alias_name: string;
  user_updated_date: string | null;
  user_updated_by: string | null;
}

export interface InvestorAliasBulkUpdateRequest {
  Investors: InvestorAliasUpdatePayload[];
}

/** Entity for InvestorAlias CRUD (`api/InvestorAlias`). */
export interface InvestorAlias {
  investorAliasId: number;
  investorAliasName: string;
  createdBy: string;
  createdDtm: string;
  updatedBy: string;
  updatedDtm: string;
}
