/** KingSett brand — Pie & Bar chart colour sequence (Chart Samples, page 9). */
export const DASHBOARD_BAR_PIE_CHART_SERIES_COLORS = [
  '#0C274A',
  '#456896',
  '#ACC4E3',
  '#425063',
  '#86898E',
  '#E5E5E5',
  '#344033',
  '#668C62',
  '#49374F',
  '#957695',
] as const;

/** KingSett brand — Line chart colour sequence (Chart Samples, page 9). */
export const DASHBOARD_LINE_CHART_SERIES_COLORS = [
  '#00529B',
  '#E7A614',
  '#0C274A',
  '#ACC4E3',
  '#86898E',
  '#668C62',
  '#957695',
  '#661910',
] as const;

export const DASHBOARD_CHART_COLORS = {
  primaryDarkBlue: '#0C274A',
  primaryMidBlue: '#456896',
  primaryLightBlue: '#ACC4E3',
  primaryGreyBlue: '#425063',
  primaryGrey: '#86898E',
  primaryLightGrey: '#E5E5E5',
  secondaryDarkGreen: '#344033',
  secondaryMidGreen: '#668C62',
  secondaryDarkPurple: '#49374F',
  secondaryMutedPurple: '#957695',
  tertiaryBlue: '#00529B',
  tertiaryGold: '#E7A614',
  tertiaryRed: '#661910',
  grid: '#E5E5E5',
  axis: '#000000',
  text: '#425063',
} as const;

export function dashboardBarPieSeriesColor(index: number): string {
  return DASHBOARD_BAR_PIE_CHART_SERIES_COLORS[index % DASHBOARD_BAR_PIE_CHART_SERIES_COLORS.length];
}

export function dashboardLineSeriesColor(index: number): string {
  return DASHBOARD_LINE_CHART_SERIES_COLORS[index % DASHBOARD_LINE_CHART_SERIES_COLORS.length];
}
