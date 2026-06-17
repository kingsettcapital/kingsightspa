import { FilterOperatorOption, QuickStartTemplate } from '../interfaces/data-explorer.interfaces';

export const FILTER_OPERATORS: FilterOperatorOption[] = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does not contain' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

export const QUICK_START_TEMPLATES: QuickStartTemplate[] = [
  {
    id: 'investor-overview',
    title: 'Investor Overview',
    description: 'Investor key and name',
    fieldIds: ['investor_key', 'investor_name'],
  },
  {
    id: 'fund-summary',
    title: 'Fund Summary',
    description: 'Fund code, name, and unfunded amount',
    fieldIds: ['fund_code', 'fund_name', 'unfunded_amount'],
  },
  {
    id: 'fund-nav',
    title: 'Fund NAV',
    description: 'Fund details with NAV per share',
    fieldIds: ['fund_name', 'fund_nav_per_share_amout', 'unfunded_amount'],
  },
];

export const SAVED_QUERIES_STORAGE_KEY = 'kingsight-data-explorer-saved-queries-v2';

/** Seeded demo queries from earlier builds — stripped on load. */
export const LEGACY_SEEDED_SAVED_QUERY_IDS = new Set(['sq-1', 'sq-2']);

export const DATA_EXPLORER_DEFAULT_PAGE_SIZE = 20;
export const DATA_EXPLORER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
