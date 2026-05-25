import { LOANS_RANKING_EXAMPLE_DATA } from './loans-ranking-example.data';
import { DefaultDateApiRecord } from '../interfaces/default-date.interfaces';
import { mapApiLoanToRow } from '../utils/loan-ranking.mapper';

const FUNDING_STATUS_MAP: Record<string, string> = {
  DELINQUENT: 'IN_DEFAULT',
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
};

function mapLoanStatusToFunding(status: string): string {
  const normalized = status.toUpperCase();
  return FUNDING_STATUS_MAP[normalized] ?? normalized;
}

function isoDateFromSeed(seed: string, year: number, month: number, daySpread: number): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  const day = 1 + (Math.abs(hash) % daySpread);
  const monthPad = String(month).padStart(2, '0');
  const dayPad = String(day).padStart(2, '0');
  return `${year}-${monthPad}-${dayPad}`;
}

const BRENTWOOD_DEFAULT_DATES = {
  LoanTermDefaultDate: '2025-09-25',
  DefaultDate: '2024-10-01',
  UserUpdatedDate: '2026-04-16',
};

/** Mock default-date rows at child-loan level until the live API is connected. */
export const DEFAULT_DATE_EXAMPLE_DATA: DefaultDateApiRecord[] = LOANS_RANKING_EXAMPLE_DATA.slice(
  0,
  45,
).map((loanRecord, index) => {
  const row = mapApiLoanToRow(loanRecord, index);
  const isBrentwood = row.loanKey === 'ln5037';

  return {
    LoanKey: row.loanKey,
    LoanId: row.loanId,
    LoanDescription: row.loanDescription,
    LoanAliasName: row.loanAlias,
    LoanTermDefaultDate: isBrentwood
      ? BRENTWOOD_DEFAULT_DATES.LoanTermDefaultDate
      : isoDateFromSeed(`${row.loanKey}-term`, 2024, 9, 28),
    DefaultDate: isBrentwood
      ? BRENTWOOD_DEFAULT_DATES.DefaultDate
      : isoDateFromSeed(`${row.loanKey}-default`, 2024, 10, 28),
    FundingStatus: mapLoanStatusToFunding(row.status),
    UserUpdatedDate: isBrentwood
      ? BRENTWOOD_DEFAULT_DATES.UserUpdatedDate
      : row.dateDwhUpdate,
    UserUpdatedBy: row.updatedBy,
  };
});
