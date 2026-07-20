import {
  DashboardApiWidgetId,
  DashboardMetricWidgetDto,
} from '../shared/models/api.models';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { DashboardWidgetId } from './dashboard-widgets.model';

export const DASHBOARD_WIDGET_TO_API_ID: Record<DashboardWidgetId, DashboardApiWidgetId> = {
  'portfolio-value': 'portfolioValue',
  'total-aum': 'totalAum',
  'ytd-returns': 'ytdReturns',
  'investor-count': 'investorCount',
  'asset-count': 'assetCount',
  'performance-chart': 'performanceChart',
  'asset-allocation': 'assetAllocation',
  'fund-returns': 'fundReturns',
  'investor-growth': 'investorGrowth',
  'geographic-distribution': 'geographicDistribution',
};

export const DASHBOARD_API_TO_WIDGET_ID: Record<DashboardApiWidgetId, DashboardWidgetId | null> = {
  portfolioValue: 'portfolio-value',
  activeFunds: null,
  totalAum: 'total-aum',
  ytdReturns: 'ytd-returns',
  investorCount: 'investor-count',
  assetCount: 'asset-count',
  performanceChart: 'performance-chart',
  assetAllocation: 'asset-allocation',
  fundReturns: 'fund-returns',
  investorGrowth: 'investor-growth',
  geographicDistribution: 'geographic-distribution',
};

export const DASHBOARD_SELECTABLE_API_WIDGET_IDS = (
  Object.entries(DASHBOARD_API_TO_WIDGET_ID) as [DashboardApiWidgetId, DashboardWidgetId | null][]
)
  .filter(([, widgetId]) => widgetId != null)
  .map(([apiId]) => apiId);

export function toApiWidgetIds(ids: readonly DashboardWidgetId[]): DashboardApiWidgetId[] {
  return ids.map((id) => DASHBOARD_WIDGET_TO_API_ID[id]);
}

export function toApiWidgetsParam(ids: readonly DashboardWidgetId[]): string {
  return toApiWidgetIds(ids).join(',');
}

export interface DashboardMetricViewModel {
  value: string;
  change: string;
  changePositive: boolean;
  hint: string;
}

export function formatDashboardMetric(dto: DashboardMetricWidgetDto): DashboardMetricViewModel {
  let value: string;
  switch (dto.format) {
    case 'money':
      value = formatCurrency(dto.value, { compact: true });
      break;
    case 'percent':
      value = formatPercent(dto.value);
      break;
    case 'count':
      value = dto.value.toLocaleString('en-US');
      break;
  }

  let change = '';
  let changePositive = true;

  if (dto.format === 'count' && dto.ytdChange != null) {
    const prefix = dto.ytdChange > 0 ? '+' : '';
    change = `${prefix}${dto.ytdChange.toLocaleString('en-US')} YTD`;
    changePositive = dto.ytdChange >= 0;
  } else if (dto.ytdChangePercent != null) {
    const prefix = dto.ytdChangePercent > 0 ? '+' : '';
    change = `${prefix}${dto.ytdChangePercent.toFixed(1)}% YTD`;
    changePositive = dto.ytdChangePercent >= 0;
  }

  return {
    value,
    change,
    changePositive,
    hint: dto.subtitle?.trim() || '',
  };
}

export function formatDashboardLastUpdated(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '—';
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
