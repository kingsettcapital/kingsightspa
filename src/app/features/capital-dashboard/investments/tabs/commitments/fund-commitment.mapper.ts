import {
  FundCommitmentDailyDto,
  FundCommitmentDto,
  FundCommitmentPeriodDto,
  FundCommitmentTabRow,
  FundCommitmentTimeframe,
} from '../../../shared/models/api.models';

function isDailyDto(dto: FundCommitmentDto): dto is FundCommitmentDailyDto {
  return 'date' in dto && typeof (dto as FundCommitmentDailyDto).date === 'string';
}

function formatCommitmentDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function mapFundCommitmentToTabRow(
  dto: FundCommitmentDto,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow {
  const units = String(dto.units ?? 0);
  const description = dto.description ?? '';

  if (timeframe === 'daily' && isDailyDto(dto)) {
    return {
      date: formatCommitmentDate(dto.date),
      amount: dto.amount ?? 0,
      units,
      description,
    };
  }

  const periodDto = dto as FundCommitmentPeriodDto;
  return {
    period: periodDto.period ?? '',
    amount: periodDto.amount ?? 0,
    units,
    description,
  };
}

export function mapFundCommitmentsToTabRows(
  items: FundCommitmentDto[] | null | undefined,
  timeframe: FundCommitmentTimeframe,
): FundCommitmentTabRow[] {
  return (items ?? []).map((item) => mapFundCommitmentToTabRow(item, timeframe));
}
