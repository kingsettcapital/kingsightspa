import { FundInvestorDto } from '../../shared/models/api.models';

export interface FundInvestorTabRow {
  investorKey: number;
  investorName: string;
  relationshipName: string;
  investorTypeName: string;
  contactFirstName: string;
  contactLastName: string;
}

function readString(...candidates: unknown[]): string {
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '—';
}

function readInvestorKey(dto: FundInvestorDto & Record<string, unknown>): number {
  const candidates = [dto.investorKey, dto['investor_key'], dto['InvestorKey']];
  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

export function mapFundInvestorToTabRow(dto: FundInvestorDto): FundInvestorTabRow {
  const raw = dto as FundInvestorDto & Record<string, unknown>;
  return {
    investorKey: readInvestorKey(raw),
    investorName: readString(
      raw.investorName,
      raw['investor_name'],
      raw['InvestorName'],
    ),
    relationshipName: readString(
      raw.relationship_name,
      raw['relationshipName'],
      raw['RelationshipName'],
    ),
    investorTypeName: readString(
      raw.investorType,
      raw['investor_type'],
      raw['investor_type_name'],
      raw['InvestorType'],
      raw['InvestorTypeName'],
    ),
    contactFirstName: readString(
      raw.contact_first_name,
      raw['contactFirstName'],
      raw['ContactFirstName'],
    ),
    contactLastName: readString(
      raw.contact_last_name,
      raw['contactLastName'],
      raw['ContactLastName'],
    ),
  };
}

export function mapFundInvestorsToTabRows(
  items: FundInvestorDto[] | null | undefined,
): FundInvestorTabRow[] {
  return (items ?? []).map(mapFundInvestorToTabRow);
}
