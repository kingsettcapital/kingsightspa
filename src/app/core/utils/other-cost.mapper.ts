import { OtherCostApiRecord, OtherCostRow } from '../interfaces/other-cost.interfaces';

export function mapApiOtherCostToRow(record: OtherCostApiRecord, index: number): OtherCostRow {
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanId = getRecordValue(record, ['loanId', 'LoanId', 'loanCode', 'LoanCode']);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
  ]);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedLoanKey = loanKey || `oc-${index + 1}`;

  return {
    loanKey: resolvedLoanKey,
    loanId: loanId || resolvedLoanKey,
    loanDescription: loanDescription || '-',
    loanAlias: loanAlias || '-',
    outstandingInvoices: parseAmount(record['outstandingInvoices'] ?? record['OutstandingInvoices']) ?? 0,
    estRealizationCosts: parseAmount(record['estRealizationCosts'] ?? record['EstRealizationCosts']) ?? 0,
    costToComplete: parseAmount(record['costToComplete'] ?? record['CostToComplete']) ?? 0,
    fundingStatus: fundingStatus.toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

function parseAmount(value: string | number | boolean | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).replace(/[$,\s]/g, '');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecordValue(record: OtherCostApiRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeDate(value: string): string {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
}
