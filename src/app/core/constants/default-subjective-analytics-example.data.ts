import { LOANS_RANKING_EXAMPLE_DATA } from './loans-ranking-example.data';
import {
  DEFAULT_STATUS_OPTIONS,
  EXIT_PLAN_OPTIONS,
} from './default-subjective-analytics-options';
import { DefaultSubjectiveAnalyticsApiRecord } from '../interfaces/default-subjective-analytics.interfaces';
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

function pickFromOptions<T extends readonly string[]>(options: T, seed: string): T[number] {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

const BRENTWOOD_SUBJECTIVE = {
  MaturityDate: '2024-07-01',
  DefaultStatus: 'Executing Plan',
  ExitPlan: 'Sitting',
  ExitDate: '2025-06-15',
  MaturityAdditionalDetail: '',
  UserUpdatedDate: '2024-04-16',
};

/** Mock subjective analytics rows at child-loan level until the live API is connected. */
export const DEFAULT_SUBJECTIVE_ANALYTICS_EXAMPLE_DATA: DefaultSubjectiveAnalyticsApiRecord[] =
  LOANS_RANKING_EXAMPLE_DATA.slice(0, 45).map((loanRecord, index) => {
    const row = mapApiLoanToRow(loanRecord, index);
    const isBrentwood = row.loanKey === 'ln5037';

    return {
      LoanKey: row.loanKey,
      LoanId: row.loanId,
      LoanDescription: row.loanDescription,
      LoanAliasName: row.loanAlias,
      MaturityDate: isBrentwood
        ? BRENTWOOD_SUBJECTIVE.MaturityDate
        : isoDateFromSeed(`${row.loanKey}-maturity`, 2024, 7, 28),
      DefaultStatus: isBrentwood
        ? BRENTWOOD_SUBJECTIVE.DefaultStatus
        : pickFromOptions(DEFAULT_STATUS_OPTIONS, `${row.loanKey}-status`),
      ExitPlan: isBrentwood
        ? BRENTWOOD_SUBJECTIVE.ExitPlan
        : pickFromOptions(EXIT_PLAN_OPTIONS, `${row.loanKey}-exit`),
      ExitDate: isBrentwood
        ? BRENTWOOD_SUBJECTIVE.ExitDate
        : isoDateFromSeed(`${row.loanKey}-exit-date`, 2025, 3, 28),
      MaturityAdditionalDetail: isBrentwood ? BRENTWOOD_SUBJECTIVE.MaturityAdditionalDetail : '',
      FundingStatus: mapLoanStatusToFunding(row.status),
      UserUpdatedDate: isBrentwood ? BRENTWOOD_SUBJECTIVE.UserUpdatedDate : row.dateDwhUpdate,
      UserUpdatedBy: row.updatedBy,
    };
  });
