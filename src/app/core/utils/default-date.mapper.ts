import { DefaultDateApiRecord, DefaultDateRow } from '../interfaces/default-date.interfaces';

export function mapApiDefaultDateToRow(record: DefaultDateApiRecord, index: number): DefaultDateRow {
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanId = getRecordValue(record, ['loanId', 'LoanId', 'loanCode', 'LoanCode']);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
  ]);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const loanTermDefaultDate = getRecordValue(record, [
    'loanTermDefaultDate',
    'LoanTermDefaultDate',
    'termDefaultDate',
    'TermDefaultDate',
  ]);
  const defaultDate = getRecordValue(record, ['defaultDate', 'DefaultDate']);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedLoanKey = loanKey || `dd-${index + 1}`;

  return {
    loanKey: resolvedLoanKey,
    loanId: loanId || resolvedLoanKey,
    loanDescription: loanDescription || '-',
    loanAlias: loanAlias || '-',
    loanTermDefaultDate: normalizeDate(loanTermDefaultDate),
    defaultDate: normalizeDate(defaultDate),
    fundingStatus: fundingStatus.toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

function getRecordValue(record: DefaultDateApiRecord, keys: string[]): string {
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
