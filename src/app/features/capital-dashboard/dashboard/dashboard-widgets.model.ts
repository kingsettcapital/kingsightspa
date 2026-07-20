export type DashboardWidgetId =
  | 'portfolio-value'
  | 'total-aum'
  | 'ytd-returns'
  | 'investor-count'
  | 'asset-count'
  | 'performance-chart'
  | 'asset-allocation'
  | 'fund-returns'
  | 'investor-growth'
  | 'geographic-distribution';

export type DashboardWidgetKind = 'metric' | 'chart' | 'table';

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  label: string;
  icon: string;
  kind: DashboardWidgetKind;
  displayOrder: number;
}

export const DASHBOARD_WIDGET_MAX = 5;

export const DASHBOARD_WIDGETS: DashboardWidgetDefinition[] = [
  { id: 'portfolio-value', label: 'Portfolio Value', icon: 'payments', kind: 'metric', displayOrder: 1 },
  { id: 'total-aum', label: 'Total AUM', icon: 'show_chart', kind: 'metric', displayOrder: 2 },
  { id: 'ytd-returns', label: 'YTD Returns', icon: 'percent', kind: 'metric', displayOrder: 3 },
  { id: 'investor-count', label: 'Total Investors', icon: 'groups', kind: 'metric', displayOrder: 4 },
  { id: 'asset-count', label: 'Total Assets', icon: 'apartment', kind: 'metric', displayOrder: 5 },
  { id: 'performance-chart', label: 'Performance Chart', icon: 'show_chart', kind: 'chart', displayOrder: 6 },
  { id: 'asset-allocation', label: 'Asset Allocation', icon: 'donut_large', kind: 'chart', displayOrder: 7 },
  { id: 'fund-returns', label: 'Fund Returns', icon: 'bar_chart', kind: 'chart', displayOrder: 8 },
  { id: 'investor-growth', label: 'Investor Count Growth', icon: 'groups', kind: 'chart', displayOrder: 9 },
  { id: 'geographic-distribution', label: 'Geographic Distribution', icon: 'location_city', kind: 'chart', displayOrder: 10 },
];

export const DEFAULT_DASHBOARD_WIDGETS: DashboardWidgetId[] = [
  'portfolio-value',
  'asset-allocation',
  'geographic-distribution',
];

export function sortWidgetIds(ids: DashboardWidgetId[]): DashboardWidgetId[] {
  const order = new Map(DASHBOARD_WIDGETS.map((widget) => [widget.id, widget.displayOrder]));
  return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

export function widgetDefinition(id: DashboardWidgetId): DashboardWidgetDefinition {
  return DASHBOARD_WIDGETS.find((widget) => widget.id === id)!;
}
