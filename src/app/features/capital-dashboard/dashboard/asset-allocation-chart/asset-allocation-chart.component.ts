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
import { dashboardLegendLabels, scheduleChartResize } from '../dashboard-chart.util';
import { DashboardAssetAllocationDto } from '../../shared/models/api.models';

Chart.register(...registerables);

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
            backgroundColor: slices.map((_, index) => dashboardBarPieSeriesColor(index)),
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
            labels: dashboardLegendLabels(),
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
