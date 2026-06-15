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
import { DASHBOARD_CHART_COLORS } from '../dashboard-chart-colors';
import { scheduleChartResize } from '../dashboard-chart.util';
import { DashboardAssetAllocationDto } from '../../shared/models/api.models';

Chart.register(...registerables);

const SLICE_COLORS = [
  DASHBOARD_CHART_COLORS.navy,
  DASHBOARD_CHART_COLORS.blueLight,
  DASHBOARD_CHART_COLORS.gold,
  DASHBOARD_CHART_COLORS.blueMid,
  DASHBOARD_CHART_COLORS.grayLight,
  DASHBOARD_CHART_COLORS.grayMid,
  DASHBOARD_CHART_COLORS.office,
  DASHBOARD_CHART_COLORS.industrial,
  DASHBOARD_CHART_COLORS.retail,
];

@Component({
  selector: 'app-asset-allocation-chart',
  standalone: true,
  imports: [DashboardWidgetCardComponent],
  templateUrl: './asset-allocation-chart.component.html',
  styleUrl: './asset-allocation-chart.component.scss',
})
export class AssetAllocationChartComponent implements AfterViewInit, OnDestroy {
  readonly chartData = input<DashboardAssetAllocationDto | null>(null);

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

  private renderChart(data: DashboardAssetAllocationDto | null): void {
    const slices = data?.slices ?? [];
    this.chart?.destroy();
    this.chart = undefined;

    if (!slices.length) {
      return;
    }

    const canvas = this.canvasRef().nativeElement;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: slices.map((item) => item.label),
        datasets: [
          {
            data: slices.map((item) => item.sharePercent),
            backgroundColor: slices.map((_, index) => SLICE_COLORS[index % SLICE_COLORS.length]),
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 14,
              color: DASHBOARD_CHART_COLORS.text,
              font: { family: "'Open Sans', Arial, sans-serif", size: 11 },
            },
          },
          tooltip: {
            backgroundColor: '#1a202c',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
    scheduleChartResize(this.chart);
  }
}
