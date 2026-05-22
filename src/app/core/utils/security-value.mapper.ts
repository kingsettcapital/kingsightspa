import {
  SecurityValueApiRecord,
  SecurityValueRow,
} from '../interfaces/security-value.interfaces';

export function mapApiSecurityValueToRow(
  record: SecurityValueApiRecord,
  index: number,
): SecurityValueRow {
  const loanKey = getRecordValue(record, ['loanKey', 'LoanKey']);
  const loanAlias = getRecordValue(record, ['loanAlias', 'LoanAlias', 'loanAliasName', 'LoanAliasName']);
  const collateralRaw = getRecordValue(record, [
    'collateralPerYardi',
    'CollateralPerYardi',
    'collateral',
    'Collateral',
  ]);
  const securityRaw = record['securityValue'] ?? record['SecurityValue'];
  const overridden = getRecordBoolean(record, ['securityValueOverridden', 'SecurityValueOverridden']);
  const fundingStatus = getRecordValue(record, ['fundingStatus', 'FundingStatus', 'status', 'Status']);
  const dateDwhUpdate = getRecordValue(record, [
    'dateDwhUpdate',
    'DateDwhUpdate',
    'userUpdatedDate',
    'UserUpdatedDate',
  ]);
  const updatedBy = getRecordValue(record, ['updatedBy', 'UpdatedBy', 'userUpdatedBy', 'UserUpdatedBy']);

  const resolvedLoanKey = loanKey || `sv-${index + 1}`;
  const resolvedAlias = loanAlias || '-';
  const collateralPerYardi = parseAmount(collateralRaw) ?? 0;

  let securityValue: number | null = null;
  if (securityRaw !== undefined && securityRaw !== null && String(securityRaw).trim() !== '') {
    securityValue = parseAmount(String(securityRaw));
  }

  if (securityValue === null && !overridden) {
    securityValue = collateralPerYardi;
  }

  return {
    loanKey: resolvedLoanKey,
    loanAlias: resolvedAlias,
    collateralPerYardi,
    securityValue,
    securityValueOverridden: overridden,
    fundingStatus: fundingStatus.toUpperCase() || 'ACTIVE',
    dateDwhUpdate: normalizeDate(dateDwhUpdate),
    updatedBy: updatedBy || '-',
  };
}

export function rowToSecurityValueApiRecord(row: SecurityValueRow): SecurityValueApiRecord {
  return {
    LoanKey: row.loanKey,
    LoanAliasName: row.loanAlias,
    CollateralPerYardi: row.collateralPerYardi,
    SecurityValue: row.securityValue,
    SecurityValueOverridden: row.securityValueOverridden,
    FundingStatus: row.fundingStatus,
    UserUpdatedDate: row.dateDwhUpdate,
    UserUpdatedBy: row.updatedBy,
  };
}

function parseAmount(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, '');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRecordBoolean(record: SecurityValueApiRecord, keys: string[]): boolean {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }
  return false;
}

function getRecordValue(record: SecurityValueApiRecord, keys: string[]): string {
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
