import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap } from 'rxjs';

import {
  DashboardWidgetsDataDto,
  DashboardWidgetOptionDto,
} from '../shared/models/api.models';
import { CapitalDashboardApiService } from '../shared/services/capital-dashboard-api.service';
import { ActiveAssetsTableComponent } from './active-assets-table/active-assets-table.component';
import { ActiveFundsTableComponent } from './active-funds-table/active-funds-table.component';
import { AssetAllocationChartComponent } from './asset-allocation-chart/asset-allocation-chart.component';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { DashboardMetricWidgetComponent } from './dashboard-metric-widget/dashboard-metric-widget.component';
import { DashboardWidgetShellComponent } from './dashboard-widget-shell/dashboard-widget-shell.component';
import {
  DASHBOARD_API_TO_WIDGET_ID,
  DASHBOARD_WIDGET_TO_API_ID,
  formatDashboardMetric,
  toApiWidgetsParam,
} from './dashboard-widget-api.util';
import {
  DEFAULT_DASHBOARD_WIDGETS,
  DASHBOARD_WIDGET_MAX,
  DASHBOARD_WIDGETS,
  DashboardWidgetDefinition,
  DashboardWidgetId,
  sortWidgetIds,
  widgetDefinition,
} from './dashboard-widgets.model';
import { GeographicDistributionChartComponent } from './geographic-distribution-chart/geographic-distribution-chart.component';
import { InvestorGrowthChartComponent } from './investor-growth-chart/investor-growth-chart.component';
import { ManageWidgetsPanelComponent } from './manage-widgets-panel/manage-widgets-panel.component';
import { PortfolioPerformanceChartComponent } from './portfolio-performance-chart/portfolio-performance-chart.component';
import { PortfolioValueWidgetComponent } from './portfolio-value-widget/portfolio-value-widget.component';
import { QuarterlyReturnsChartComponent } from './quarterly-returns-chart/quarterly-returns-chart.component';
import { TotalAssetsWidgetComponent } from './total-assets-widget/total-assets-widget.component';
import { YtdReturnsWidgetComponent } from './ytd-returns-widget/ytd-returns-widget.component';

@Component({
  selector: 'app-capital-dashboard-dashboard',
  standalone: true,
  imports: [
    DashboardHeaderComponent,
    ManageWidgetsPanelComponent,
    DashboardWidgetShellComponent,
    PortfolioPerformanceChartComponent,
    AssetAllocationChartComponent,
    QuarterlyReturnsChartComponent,
    PortfolioValueWidgetComponent,
    YtdReturnsWidgetComponent,
    TotalAssetsWidgetComponent,
    DashboardMetricWidgetComponent,
    InvestorGrowthChartComponent,
    GeographicDistributionChartComponent,
    ActiveFundsTableComponent,
    ActiveAssetsTableComponent,
  ],
  templateUrl: './capital-dashboard-dashboard.component.html',
  styleUrl: './capital-dashboard-dashboard.component.scss',
})
export class CapitalDashboardDashboardComponent {
  private readonly dashboardApi = inject(CapitalDashboardApiService);

  readonly maxWidgets = DASHBOARD_WIDGET_MAX;
  readonly widgetDefinition = widgetDefinition;
  readonly managePanelOpen = signal(false);
  readonly selectedWidgetIds = signal<DashboardWidgetId[]>([...DEFAULT_DASHBOARD_WIDGETS]);
  readonly widgetOptions = signal<DashboardWidgetOptionDto[]>([]);
  readonly widgetData = signal<DashboardWidgetsDataDto | null>(null);
  readonly widgetsLoading = signal(true);
  readonly widgetsError = signal<string | null>(null);

  readonly visibleWidgetCount = computed(() => this.selectedWidgetIds().length);
  readonly visibleWidgetIds = computed(() => sortWidgetIds(this.selectedWidgetIds()));

  readonly availableWidgets = computed<readonly DashboardWidgetDefinition[]>(() => {
    const options = this.widgetOptions();
    const localByApiId = new Map(
      DASHBOARD_WIDGETS.map((widget) => [DASHBOARD_WIDGET_TO_API_ID[widget.id], widget]),
    );

    if (!options.length) {
      return DASHBOARD_WIDGETS;
    }

    return options
      .map((option, index) => {
        const widgetId = DASHBOARD_API_TO_WIDGET_ID[option.id];
        if (!widgetId) {
          return null;
        }

        const local = localByApiId.get(option.id);
        return {
          id: widgetId,
          label: option.label || local?.label || widgetId,
          icon: local?.icon ?? 'widgets',
          kind: local?.kind ?? 'metric',
          displayOrder: local?.displayOrder ?? index + 1,
        } satisfies DashboardWidgetDefinition;
      })
      .filter((widget): widget is DashboardWidgetDefinition => widget != null)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  });

  readonly portfolioValueMetric = computed(() => {
    const metric = this.widgetData()?.portfolioValue;
    return metric ? formatDashboardMetric(metric) : null;
  });

  readonly totalAumMetric = computed(() => {
    const metric = this.widgetData()?.totalAum;
    return metric ? formatDashboardMetric(metric) : null;
  });

  readonly ytdReturnsMetric = computed(() => {
    const metric = this.widgetData()?.ytdReturns;
    return metric ? formatDashboardMetric(metric) : null;
  });

  readonly investorCountMetric = computed(() => {
    const metric = this.widgetData()?.investorCount;
    return metric ? formatDashboardMetric(metric) : null;
  });

  readonly assetCountMetric = computed(() => {
    const metric = this.widgetData()?.assetCount;
    return metric ? formatDashboardMetric(metric) : null;
  });

  constructor() {
    this.dashboardApi
      .getWidgetOptions()
      .pipe(
        catchError(() => of([] as DashboardWidgetOptionDto[])),
        takeUntilDestroyed(),
      )
      .subscribe((options) => {
        this.widgetOptions.set(options);
        this.syncSelectedWidgets(options);
      });

    toObservable(this.visibleWidgetIds)
      .pipe(
        switchMap((widgetIds) => {
          if (!widgetIds.length) {
            this.widgetData.set(null);
            this.widgetsLoading.set(false);
            this.widgetsError.set(null);
            return of(null);
          }

          this.widgetsLoading.set(true);
          this.widgetsError.set(null);

          return this.dashboardApi.getDashboard({ widgets: toApiWidgetsParam(widgetIds) }).pipe(
            catchError(() => {
              this.widgetsError.set('Unable to load dashboard widgets.');
              return of(null);
            }),
            tap(() => this.widgetsLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.widgetData.set(response?.widgets ?? null);
      });
  }

  toggleManagePanel(): void {
    this.managePanelOpen.update((open) => !open);
  }

  updateSelectedWidgets(ids: DashboardWidgetId[]): void {
    this.selectedWidgetIds.set(sortWidgetIds(ids));
  }

  removeWidget(id: DashboardWidgetId): void {
    this.selectedWidgetIds.update((ids) => ids.filter((widgetId) => widgetId !== id));
  }

  widgetShellCloseVariant(id: DashboardWidgetId): 'on-dark' | 'on-light' {
    return widgetDefinition(id).kind === 'metric' ? 'on-dark' : 'on-light';
  }

  widgetCssClass(id: DashboardWidgetId): string {
    return `cdt-dashboard__widget--${widgetDefinition(id).kind}`;
  }

  private syncSelectedWidgets(options: DashboardWidgetOptionDto[]): void {
    if (!options.length) {
      return;
    }

    const allowed = new Set(
      options
        .map((option) => DASHBOARD_API_TO_WIDGET_ID[option.id])
        .filter((id): id is DashboardWidgetId => id != null),
    );

    const current = this.selectedWidgetIds().filter((id) => allowed.has(id));
    if (current.length) {
      const sorted = sortWidgetIds(current);
      const existing = this.selectedWidgetIds();
      const unchanged =
        sorted.length === existing.length && sorted.every((id, index) => id === existing[index]);
      if (!unchanged) {
        this.selectedWidgetIds.set(sorted);
      }
      return;
    }

    const defaults = DEFAULT_DASHBOARD_WIDGETS.filter((id) => allowed.has(id));
    this.selectedWidgetIds.set(
      sortWidgetIds(defaults.length ? defaults : [...allowed].slice(0, DASHBOARD_WIDGET_MAX)),
    );
  }
}
