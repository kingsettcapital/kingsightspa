import { LOANS_RANKING_EXAMPLE_DATA } from './loans-ranking-example.data';
import { OtherCostApiRecord } from '../interfaces/other-cost.interfaces';
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

function costFromSeed(seed: string, base: number, spread: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return base + (Math.abs(hash) % spread);
}

const BRENTWOOD_COSTS = {
  OutstandingInvoices: 10_000,
  EstRealizationCosts: 12_000,
  CostToComplete: 1_000_000,
};

/** Mock other-cost rows at child-loan level until the live API is connected. */
export const OTHER_COST_EXAMPLE_DATA: OtherCostApiRecord[] = LOANS_RANKING_EXAMPLE_DATA.slice(
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
    OutstandingInvoices: isBrentwood
      ? BRENTWOOD_COSTS.OutstandingInvoices
      : costFromSeed(`${row.loanKey}-inv`, 5_000, 95_000),
    EstRealizationCosts: isBrentwood
      ? BRENTWOOD_COSTS.EstRealizationCosts
      : costFromSeed(`${row.loanKey}-est`, 8_000, 120_000),
    CostToComplete: isBrentwood
      ? BRENTWOOD_COSTS.CostToComplete
      : costFromSeed(`${row.loanKey}-ctc`, 250_000, 2_500_000),
    FundingStatus: mapLoanStatusToFunding(row.status),
    UserUpdatedDate: row.dateDwhUpdate,
    UserUpdatedBy: row.updatedBy,
  };
});
