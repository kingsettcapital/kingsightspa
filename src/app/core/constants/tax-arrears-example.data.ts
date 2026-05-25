import { LOANS_RANKING_EXAMPLE_DATA } from './loans-ranking-example.data';
import { TaxArrearsApiRecord } from '../interfaces/tax-arrears.interfaces';
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

function amountFromSeed(seed: string, base: number, spread: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.round((base + (Math.abs(hash) % spread)) * 100) / 100;
}

const BRENTWOOD_TAX_ARREARS: Array<{ TaxYear: string; TaxArrears: number }> = [
  { TaxYear: '2024', TaxArrears: 538_361.98 },
  { TaxYear: '2025', TaxArrears: 318_552.12 },
];

/** Mock tax-arrears rows at main/parent loan level until the live API is connected. */
export const TAX_ARREARS_EXAMPLE_DATA: TaxArrearsApiRecord[] = LOANS_RANKING_EXAMPLE_DATA.slice(
  0,
  24,
).flatMap((loanRecord, index) => {
  const row = mapApiLoanToRow(loanRecord, index);
  const isBrentwood = row.loanKey === 'ln5037';
  const years = isBrentwood
    ? BRENTWOOD_TAX_ARREARS
    : [{ TaxYear: '2024', TaxArrears: amountFromSeed(`${row.loanKey}-2024`, 75_000, 400_000) }];

  return years.map((entry) => ({
    RecordKey: `${row.loanKey}-${entry.TaxYear}`,
    LoanKey: row.loanKey,
    LoanId: row.loanId,
    LoanDescription: row.loanDescription,
    LoanAliasName: row.loanAlias,
    TaxMemoDate: '2026-03-15',
    TaxArrears: entry.TaxArrears,
    TaxYear: entry.TaxYear,
    Notes: isBrentwood ? 'Quarter tax memo review' : '',
    FundingStatus: mapLoanStatusToFunding(row.status),
    UserUpdatedDate: isBrentwood ? '2026-04-16' : row.dateDwhUpdate,
    UserUpdatedBy: row.updatedBy,
  }));
});
