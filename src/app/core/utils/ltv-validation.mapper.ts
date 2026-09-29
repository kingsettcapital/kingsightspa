import { LtvValidationApiRecord, LtvValidationRow } from '../interfaces/ltv-validation.interfaces';

export function mapApiLtvValidationToRow(
  record: LtvValidationApiRecord,
  index: number,
): LtvValidationRow {
  const recordKey = getRecordValue(record, ['recordKey', 'RecordKey']);
  const parentLoanId = getRecordValue(record, ['parentLoanId', 'ParentLoanId']);
  const childLoanId = getRecordValue(record, ['childLoanId', 'ChildLoanId', 'loanId', 'LoanId']);
  const loanDescription = getRecordValue(record, [
    'loanDescription',
    'LoanDescription',
    'loanDesc',
    'LoanDesc',
  ]);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const investorAlias = getRecordValue(record, [
    'investorAlias',
    'InvestorAlias',
    'investorName',
    'InvestorName',
  ]);
  const aiCommentary = getRecordValue(record, ['aiCommentary', 'AiCommentary', 'AICommentary']);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedRecordKey = recordKey || `ltv-${index + 1}`;

  return {
    recordKey: resolvedRecordKey,
    parentLoanId: parentLoanId || childLoanId || resolvedRecordKey,
    childLoanId: childLoanId || resolvedRecordKey,
    loanDescription: loanDescription || '-',
    loanAlias: loanAlias || '-',
    investorAlias: investorAlias || '-',
    securityValue: parseAmount(record['securityValue'] ?? record['SecurityValue']),
    exposure: parseAmount(record['exposure'] ?? record['Exposure']) ?? 0,
    ranking: parseInteger(record['ranking'] ?? record['Ranking']) ?? 0,
    ltv: parseAmount(record['ltv'] ?? record['LTV'] ?? record['Ltv']),
    aiCommentary: aiCommentary || '-',
    fundingStatus: fundingStatus.toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

function parseAmount(value: string | number | boolean | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const normalized = String(value).replace(/[$,%\s]/g, '');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string | number | boolean | null | undefined): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecordValue(record: LtvValidationApiRecord, keys: string[]): string {
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
