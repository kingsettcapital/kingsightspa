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
import { DashboardLineChartDto } from '../../shared/models/api.models';

Chart.register(...registerables);

const LINE_COLORS = [
  DASHBOARD_CHART_COLORS.grayDark,
  DASHBOARD_CHART_COLORS.gold,
  DASHBOARD_CHART_COLORS.blueMid,
  DASHBOARD_CHART_COLORS.navy,
  DASHBOARD_CHART_COLORS.blueLight,
];

@Component({
  selector: 'app-portfolio-performance-chart',
  standalone: true,
  imports: [DashboardWidgetCardComponent],
  templateUrl: './portfolio-performance-chart.component.html',
  styleUrl: './portfolio-performance-chart.component.scss',
})
export class PortfolioPerformanceChartComponent implements AfterViewInit, OnDestroy {
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
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const categories = data?.categories ?? [];
    const series = data?.series ?? [];

    this.chart?.destroy();
    this.chart = undefined;

    if (!categories.length || !series.length) {
      return;
    }

    const datasets = series.map((item, index) => {
      const color = LINE_COLORS[index % LINE_COLORS.length];
      const gradient = context.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, `${color}33`);
      gradient.addColorStop(1, `${color}00`);

      return {
        label: item.name,
        data: item.values.map((value) => value ?? 0),
        borderColor: color,
        backgroundColor: gradient,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.4,
        fill: true,
      };
    });

    const values = series.flatMap((item) => item.values).filter((value): value is number => value != null);
    const maxValue = values.length ? Math.max(...values, 0) : 12;
    const yMax = Math.max(3, Math.ceil(maxValue / 3) * 3);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: categories,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: series.length > 0,
            position: 'bottom',
            align: 'center',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              padding: 16,
              color: DASHBOARD_CHART_COLORS.text,
              font: {
                family: "'Open Sans', Arial, sans-serif",
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: '#1a202c',
            padding: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: DASHBOARD_CHART_COLORS.text,
              font: { family: "'Open Sans', Arial, sans-serif", size: 10 },
            },
          },
          y: {
            min: 0,
            max: yMax,
            ticks: {
              stepSize: yMax / 4,
              color: DASHBOARD_CHART_COLORS.text,
              font: { family: "'Open Sans', Arial, sans-serif", size: 10 },
              callback: (value) => `${value}%`,
            },
            grid: { color: DASHBOARD_CHART_COLORS.grid },
            border: { display: false },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
    scheduleChartResize(this.chart);
  }
}
