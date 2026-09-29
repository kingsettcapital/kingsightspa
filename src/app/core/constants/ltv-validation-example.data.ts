import { LOANS_RANKING_EXAMPLE_DATA } from './loans-ranking-example.data';
import { LtvValidationApiRecord } from '../interfaces/ltv-validation.interfaces';
import { mapApiLoanToRow } from '../utils/loan-ranking.mapper';

const FUNDING_STATUS_MAP: Record<string, string> = {
  DELINQUENT: 'IN_DEFAULT',
  ACTIVE: 'ACTIVE',
  SETTLED: 'SETTLED',
};

const INVESTOR_ALIAS_MAP: Record<string, string> = {
  'GMF Nominee Inc': 'TDAM',
  'KingSett Real Estate Mortgage LP No. 3': 'MLP',
  'CIBC World Markets': 'CIBC',
  'TD Securities': 'TD',
  'RBC Capital Markets': 'RBC',
  'BMO Capital Markets': 'BMO',
  'National Bank': 'NBC',
  'Scotiabank': 'BNS',
  'HSBC Bank Canada': 'HSBC',
};

function mapLoanStatusToFunding(status: string): string {
  const normalized = status.toUpperCase();
  return FUNDING_STATUS_MAP[normalized] ?? normalized;
}

function investorAliasFromName(name: string): string {
  if (INVESTOR_ALIAS_MAP[name]) {
    return INVESTOR_ALIAS_MAP[name];
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }
  return name.slice(0, 4).toUpperCase();
}

function amountFromSeed(seed: string, base: number, spread: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  return Math.round((base + (Math.abs(hash) % spread)) * 100) / 100;
}

function commentaryFromSeed(seed: string): string {
  const confidence = 45 + (Math.abs(seed.length * 17) % 51);
  return confidence >= 80 ? `${confidence}% Confidence` : `${confidence}% Confidence. To be checked`;
}

const BRENTWOOD_PARENT = 'ln5037';
const BRENTWOOD_SECURITY_VALUE = 222_100_000;
const BRENTWOOD_CHILDREN: Array<{
  childLoanId: string;
  investorName: string;
  ranking: number;
  ltv: number;
  exposure: number;
}> = [
  { childLoanId: 'ln5037', investorName: 'GMF Nominee Inc', ranking: 1, ltv: 57, exposure: 125_521_173.86 },
  { childLoanId: 'ln5275', investorName: 'KingSett Real Estate Mortgage LP No. 3', ranking: 2, ltv: 60, exposure: 98_240_500 },
  { childLoanId: 'ln5565', investorName: 'CIBC World Markets', ranking: 3, ltv: 63, exposure: 87_115_200 },
  { childLoanId: 'ln5313', investorName: 'TD Securities', ranking: 4, ltv: 72, exposure: 76_890_450 },
  { childLoanId: 'ln0482', investorName: 'RBC Capital Markets', ranking: 5, ltv: 90, exposure: 65_420_100 },
];

/** Mock LTV validation rows at child-loan level until the live API is connected. */
export const LTV_VALIDATION_EXAMPLE_DATA: LtvValidationApiRecord[] = (() => {
  const records: LtvValidationApiRecord[] = [];

  for (const child of BRENTWOOD_CHILDREN) {
    records.push({
      RecordKey: `${BRENTWOOD_PARENT}-${child.childLoanId}`,
      ParentLoanId: BRENTWOOD_PARENT,
      ChildLoanId: child.childLoanId,
      LoanDescription: 'Brentwood Tower C - 1st Mtg',
      LoanAliasName: 'Brentwood Tower C',
      InvestorAlias: investorAliasFromName(child.investorName),
      SecurityValue: BRENTWOOD_SECURITY_VALUE,
      Exposure: child.exposure,
      Ranking: child.ranking,
      LTV: child.ltv,
      AiCommentary: commentaryFromSeed(child.childLoanId),
      FundingStatus: 'IN_DEFAULT',
      UserUpdatedDate: '2026-04-16',
      UserUpdatedBy: 'jsmith',
    });
  }

  const loans = LOANS_RANKING_EXAMPLE_DATA.slice(0, 40).map((loanRecord, index) =>
    mapApiLoanToRow(loanRecord, index),
  );
  const aliasGroups = new Map<string, typeof loans>();
  for (const loan of loans) {
    if (loan.loanAlias === 'Brentwood Tower C') {
      continue;
    }
    const group = aliasGroups.get(loan.loanAlias) ?? [];
    group.push(loan);
    aliasGroups.set(loan.loanAlias, group);
  }

  for (const [alias, group] of aliasGroups) {
    const parentLoanId = group[0]?.loanKey ?? group[0]?.loanId ?? alias;
    const securityValue = amountFromSeed(`${alias}-sec`, 80_000_000, 180_000_000);

    for (const loan of group.slice(0, 3)) {
      records.push({
        RecordKey: `${parentLoanId}-${loan.loanKey}`,
        ParentLoanId: parentLoanId,
        ChildLoanId: loan.loanId,
        LoanDescription: loan.loanDescription,
        LoanAliasName: alias,
        InvestorAlias: investorAliasFromName(loan.investorName),
        SecurityValue: securityValue,
        Exposure: amountFromSeed(`${loan.loanKey}-exp`, 25_000_000, 120_000_000),
        Ranking: loan.ranking,
        LTV: amountFromSeed(`${loan.loanKey}-ltv`, 50, 40),
        AiCommentary: commentaryFromSeed(loan.loanKey),
        FundingStatus: mapLoanStatusToFunding(loan.status),
        UserUpdatedDate: loan.dateDwhUpdate,
        UserUpdatedBy: loan.updatedBy,
      });
    }
  }

  records.push({
    RecordKey: 'ln6720-empty',
    ParentLoanId: 'ln6720',
    ChildLoanId: 'ln6720',
    LoanDescription: 'Yorkville Retail - 1st Mtg',
    LoanAliasName: 'Yorkville Retail',
    InvestorAlias: 'RBC',
    SecurityValue: null,
    Exposure: 42_500_000,
    Ranking: 1,
    LTV: null,
    AiCommentary: 'Pending QR extraction',
    FundingStatus: 'IN_DEFAULT',
    UserUpdatedDate: '2026-02-22',
    UserUpdatedBy: 'jsmith',
  });

  return records;
})();
