import { AssetsFilterOptionDto, AssetsFilterOptionsDto } from '../models/api.models';

export interface AssetsFilterOption {
  value: string;
  label: string;
}

export interface AssetsFilterOptions {
  assetTypes: AssetsFilterOption[];
  investmentTypes: AssetsFilterOption[];
  geographies: AssetsFilterOption[];
  statuses: AssetsFilterOption[];
}

export const EMPTY_ASSETS_FILTER_OPTIONS: AssetsFilterOptions = {
  assetTypes: [],
  investmentTypes: [],
  geographies: [],
  statuses: [],
};

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function mapFilterOptions(items: AssetsFilterOptionDto[] | null | undefined): AssetsFilterOption[] {
  if (!items?.length) {
    return [];
  }

  return items
    .map((item) => {
      const record = readRecord(item);
      const value = String(record?.['value'] ?? record?.['Value'] ?? '');
      const label = String(record?.['label'] ?? record?.['Label'] ?? value);
      return { value, label };
    })
    .filter((item) => item.value.length > 0);
}

export function normalizeAssetsFilterOptions(
  response: AssetsFilterOptionsDto | null | undefined,
): AssetsFilterOptions {
  const record = readRecord(response);
  if (!record) {
    return EMPTY_ASSETS_FILTER_OPTIONS;
  }

  return {
    assetTypes: mapFilterOptions(
      (record['asset_types'] ?? record['assetTypes']) as AssetsFilterOptionDto[] | null | undefined,
    ),
    investmentTypes: mapFilterOptions(
      (record['investment_types'] ?? record['investmentTypes']) as
        | AssetsFilterOptionDto[]
        | null
        | undefined,
    ),
    geographies: mapFilterOptions(
      (record['geographies']) as AssetsFilterOptionDto[] | null | undefined,
    ),
    statuses: mapFilterOptions(
      (record['statuses']) as AssetsFilterOptionDto[] | null | undefined,
    ),
  };
}
