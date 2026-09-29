import {
  DefaultSubjectiveAnalyticsApiRecord,
  DefaultSubjectiveAnalyticsRow,
} from '../interfaces/default-subjective-analytics.interfaces';

export function mapApiDefaultSubjectiveAnalyticsToRow(
  record: DefaultSubjectiveAnalyticsApiRecord,
  index: number,
): DefaultSubjectiveAnalyticsRow {
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanId = getRecordValue(record, ['loanId', 'LoanId', 'loanCode', 'LoanCode']);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
  ]);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const maturityDate = getRecordValue(record, ['maturityDate', 'MaturityDate']);
  const defaultStatus = getRecordValue(record, ['defaultStatus', 'DefaultStatus']);
  const exitPlan = getRecordValue(record, ['exitPlan', 'ExitPlan']);
  const exitDate = getRecordValue(record, ['exitDate', 'ExitDate']);
  const maturityAdditionalDetail = getRecordValue(record, [
    'maturityAdditionalDetail',
    'MaturityAdditionalDetail',
    'maturityDetail',
    'MaturityDetail',
  ]);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedLoanKey = loanKey || `dsa-${index + 1}`;

  return {
    loanKey: resolvedLoanKey,
    loanId: loanId || resolvedLoanKey,
    loanDescription: loanDescription || '-',
    loanAlias: loanAlias || '-',
    maturityDate: normalizeDate(maturityDate),
    defaultStatus: defaultStatus || 'n/a',
    exitPlan: exitPlan || 'n/a',
    exitDate: normalizeDate(exitDate),
    maturityAdditionalDetail: maturityAdditionalDetail || '',
    fundingStatus: fundingStatus.toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

function getRecordValue(record: DefaultSubjectiveAnalyticsApiRecord, keys: string[]): string {
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
