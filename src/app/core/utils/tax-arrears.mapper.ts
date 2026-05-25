import { TaxArrearsApiRecord, TaxArrearsRow } from '../interfaces/tax-arrears.interfaces';

export function mapApiTaxArrearsToRow(record: TaxArrearsApiRecord, index: number): TaxArrearsRow {
  const recordKey = getRecordValue(record, ['recordKey', 'RecordKey']);
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanId = getRecordValue(record, ['loanId', 'LoanId', 'loanCode', 'LoanCode']);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
  ]);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const taxMemoDate = getRecordValue(record, ['taxMemoDate', 'TaxMemoDate']);
  const taxYear = getRecordValue(record, ['taxYear', 'TaxYear']);
  const notes = getRecordValue(record, ['notes', 'Notes']);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedRecordKey = recordKey || `ta-${index + 1}`;
  const resolvedLoanKey = loanKey || loanId || resolvedRecordKey;

  return {
    recordKey: resolvedRecordKey,
    loanKey: resolvedLoanKey,
    loanId: loanId || resolvedLoanKey,
    loanDescription: loanDescription || '-',
    loanAlias: loanAlias || '-',
    taxMemoDate: normalizeDate(taxMemoDate),
    taxArrears: parseAmount(record['taxArrears'] ?? record['TaxArrears']) ?? 0,
    taxYear: taxYear || '-',
    notes: notes || '',
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

function getRecordValue(record: TaxArrearsApiRecord, keys: string[]): string {
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
