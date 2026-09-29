import { CapitalSearchResultDto } from '../models/search.models';
import { CapitalDashboardTab } from '../../store/capital-dashboard.state';

export interface SearchResultPresentation {
  icon: string;
  iconClass: string;
  badgeLabel: string;
  badgeClass: string;
}

function normalizeEntityType(entityType: string): string {
  return entityType.trim().toLowerCase();
}

export function normalizeSearchResult(result: CapitalSearchResultDto): CapitalSearchResultDto {
  const raw = result as CapitalSearchResultDto & { entityType?: string; entityKey?: number };
  return {
    entity_type: raw.entity_type ?? raw.entityType ?? '',
    entity_key: Number(raw.entity_key ?? raw.entityKey ?? 0),
    name: raw.name ?? '',
    subtitle: raw.subtitle ?? '',
  };
}

export function searchResultEntityKey(result: CapitalSearchResultDto): number | null {
  const key = normalizeSearchResult(result).entity_key;
  return Number.isFinite(key) && key > 0 ? key : null;
}

export function searchResultTabPath(entityType: string): CapitalDashboardTab | null {
  const type = normalizeEntityType(entityType);

  if (type === 'investors' || type === 'investor') {
    return 'investor';
  }
  if (type === 'funds' || type === 'fund' || type === 'investments' || type === 'investment') {
    return 'investment';
  }
  if (type === 'assets' || type === 'asset' || type === 'properties' || type === 'property') {
    return 'asset';
  }

  return null;
}

export function searchResultPresentation(entityType: string): SearchResultPresentation {
  const type = normalizeEntityType(entityType);

  if (type === 'investors' || type === 'investor') {
    return {
      icon: 'groups',
      iconClass: 'cdt-topbar-search-item__icon--investor',
      badgeLabel: 'Investor',
      badgeClass: 'cdt-topbar-search-item__badge--investor',
    };
  }

  if (type === 'assets' || type === 'asset' || type === 'properties' || type === 'property') {
    return {
      icon: 'inventory_2',
      iconClass: 'cdt-topbar-search-item__icon--asset',
      badgeLabel: 'Asset',
      badgeClass: 'cdt-topbar-search-item__badge--asset',
    };
  }

  return {
    icon: 'bar_chart',
    iconClass: 'cdt-topbar-search-item__icon--fund',
    badgeLabel: 'Fund',
    badgeClass: 'cdt-topbar-search-item__badge--fund',
  };
}
