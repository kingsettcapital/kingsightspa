export type CapitalSearchEntityType = 'investors' | 'investor' | 'funds' | 'fund' | 'investments' | 'investment' | 'assets' | 'asset';

export interface CapitalSearchResultDto {
  entity_type: string;
  entity_key: number;
  name: string;
  subtitle: string;
}

export interface CapitalSearchResponseDto {
  search: string;
  results: CapitalSearchResultDto[];
}

export interface CapitalSearchQueryParams {
  search: string;
  limit?: number;
}
