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
import { DashboardGeographicDistributionDto } from '../../shared/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-geographic-distribution-chart',
  standalone: true,
  imports: [DashboardWidgetCardComponent],
  templateUrl: './geographic-distribution-chart.component.html',
  styleUrl: './geographic-distribution-chart.component.scss',
})
export class GeographicDistributionChartComponent implements AfterViewInit, OnDestroy {
  readonly chartData = input<DashboardGeographicDistributionDto | null>(null);

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

  private renderChart(data: DashboardGeographicDistributionDto | null): void {
    const canvas = this.canvasRef().nativeElement;
    const items = data?.items ?? [];

    this.chart?.destroy();
    this.chart = undefined;

    if (!items.length) {
      return;
    }

    const values = items.map((item) => item.sharePercent);

    const maxValue = values.length ? Math.max(...values, 0) : 60;
    const xMax = Math.max(15, Math.ceil(maxValue / 15) * 15);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: items.map((item) => item.label),
        datasets: [
          {
            label: 'Distribution',
            data: values,
            backgroundColor: DASHBOARD_CHART_COLORS.navy,
            borderRadius: 2,
            barThickness: 16,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a202c',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.x}%`,
            },
          },
        },
        scales: {
          x: {
            min: 0,
            max: xMax,
            ticks: {
              stepSize: xMax / 4,
              color: DASHBOARD_CHART_COLORS.text,
              font: { family: "'Open Sans', Arial, sans-serif", size: 10 },
              callback: (value) => `${value}%`,
            },
            grid: { color: DASHBOARD_CHART_COLORS.grid },
            border: { display: false },
          },
          y: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: DASHBOARD_CHART_COLORS.text,
              font: { family: "'Open Sans', Arial, sans-serif", size: 10 },
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
    scheduleChartResize(this.chart);
  }
}
