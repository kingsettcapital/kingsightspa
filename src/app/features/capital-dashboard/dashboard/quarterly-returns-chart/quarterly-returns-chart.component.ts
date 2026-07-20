import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { DashboardWidgetCardComponent } from '../dashboard-widget-card/dashboard-widget-card.component';
import { dashboardBarPieSeriesColor } from '../dashboard-chart-colors';
import {
  dashboardLegendLabels,
  dashboardVerticalChartScales,
  scheduleChartResize,
} from '../dashboard-chart.util';
import { DashboardLineChartDto } from '../../shared/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-quarterly-returns-chart',
  standalone: true,
  imports: [DashboardWidgetCardComponent],
  templateUrl: './quarterly-returns-chart.component.html',
  styleUrl: './quarterly-returns-chart.component.scss',
})
export class QuarterlyReturnsChartComponent implements AfterViewInit, OnDestroy {
  readonly chartData = input<DashboardLineChartDto | null>(null);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly viewReady = signal(false);
  private chart?: Chart;

  constructor() {
    effect(() => {
      if (!this.viewReady()) {
        return;
      }
      this.renderChart(this.chartData());
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(data: DashboardLineChartDto | null): void {
    const canvas = this.canvasRef().nativeElement;
    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    this.chart?.destroy();
    this.chart = undefined;

    if (!categories.length || !series.length) {
      return;
    }

    const datasets = series.map((item, index) => ({
      label: item.name,
      data: item.values.map((value) => value ?? 0),
      backgroundColor: dashboardBarPieSeriesColor(index),
      borderRadius: 0,
      maxBarThickness: 14,
    }));

    const values = series.flatMap((item) => item.values).filter((value): value is number => value != null);
    const maxValue = values.length ? Math.max(...values, 0) : 3;
    const yMax = Math.max(1, Math.ceil(maxValue * 1.25 * 4) / 4);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: categories,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: series.length > 0,
            position: 'bottom',
            labels: dashboardLegendLabels(),
          },
          tooltip: {
            backgroundColor: '#1a202c',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
            },
          },
        },
        scales: dashboardVerticalChartScales({
          yMax,
          yStep: yMax / 4,
        }),
      },
    };

    this.chart = new Chart(canvas, config);
    scheduleChartResize(this.chart);
  }
}
