import { InvestorDetailDto, InvestorDetailFundDto } from '../../../shared/models/api.models';
import { InvestorDetailFundMembership } from '../models/investor-detail-block.models';

const INVESTOR_OVERVIEW_VISIBLE_FUNDS = 5;

export interface InvestorDetailKpiCards {
  totalCommitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  unfunded: number;
  releasedCapital: number;
  fundsCount: number;
  capitalDeployed: number | null;
}

function detailRecord(detail: InvestorDetailDto | null): Record<string, unknown> {
  return (detail ?? {}) as unknown as Record<string, unknown>;
}

function summaryRecord(detail: InvestorDetailDto | null): Record<string, unknown> {
  return (detail?.summary ?? {}) as unknown as Record<string, unknown>;
}

function readStringFromRecord(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readNumberFromRecord(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function readInvestorDetailString(detail: InvestorDetailDto | null, ...keys: string[]): string {
  return (
    readStringFromRecord(detailRecord(detail), ...keys) ||
    readStringFromRecord(summaryRecord(detail), ...keys)
  );
}

export function readInvestorDetailNumber(detail: InvestorDetailDto | null, ...keys: string[]): number | null {
  const fromTop = readNumberFromRecord(detailRecord(detail), ...keys);
  if (fromTop != null) {
    return fromTop;
  }
  return readNumberFromRecord(summaryRecord(detail), ...keys);
}

function readFundKey(fund: InvestorDetailFundDto): number {
  const candidates = [fund.fund_key, fund.fundKey];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function readFundName(fund: InvestorDetailFundDto): string {
  const candidates = [fund.fund_name, fund.fundName];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function investorDetailHasProfileData(detail: InvestorDetailDto | null): boolean {
  if (!detail) {
    return false;
  }
  return (
    readInvestorDetailString(detail, 'investor_name', 'investorName', 'InvestorName').length > 0 ||
    readInvestorDetailNumber(detail, 'total_commitment', 'totalCommitment') != null
  );
}

export function kpiCardsFromInvestorDetail(detail: InvestorDetailDto | null): InvestorDetailKpiCards {
  return {
    totalCommitment:
      readInvestorDetailNumber(detail, 'total_commitment', 'totalCommitment') ?? 0,
    netInvestedCapital:
      readInvestorDetailNumber(detail, 'net_invested_capital', 'netInvestedCapital') ?? 0,
    netDistributed:
      readInvestorDetailNumber(detail, 'net_distributed', 'netDistributed') ?? 0,
    reservedUncalled:
      readInvestorDetailNumber(detail, 'reserved_uncalled', 'reservedUncalled') ?? 0,
    unfunded: 0,
    releasedCapital:
      readInvestorDetailNumber(detail, 'released_capital', 'releasedCapital') ?? 0,
    fundsCount: readInvestorDetailNumber(detail, 'fund_count', 'fundCount') ?? detail?.funds?.length ?? 0,
    capitalDeployed:
      readInvestorDetailNumber(detail, 'capital_deployed', 'capitalDeployed'),
  };
}

export function fundMembershipFromInvestorDetail(detail: InvestorDetailDto | null): InvestorDetailFundMembership {
  const funds = (detail?.funds ?? [])
    .map((fund) => ({
      fundKey: readFundKey(fund),
      name: readFundName(fund),
    }))
    .filter((fund) => fund.fundKey > 0 && fund.name);

  return {
    count: readInvestorDetailNumber(detail, 'fund_count', 'fundCount') ?? funds.length,
    items: funds.slice(0, INVESTOR_OVERVIEW_VISIBLE_FUNDS),
    moreCount: Math.max(0, funds.length - INVESTOR_OVERVIEW_VISIBLE_FUNDS),
  };
}
