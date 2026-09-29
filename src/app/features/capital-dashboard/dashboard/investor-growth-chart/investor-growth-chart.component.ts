import {
  AfterViewInit,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { DashboardWidgetCardComponent } from '../dashboard-widget-card/dashboard-widget-card.component';
import { dashboardLineSeriesColor } from '../dashboard-chart-colors';
import { DashboardChartLifecycle, dashboardVerticalChartScales } from '../dashboard-chart.util';
import { DashboardLineChartDto } from '../../shared/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-investor-growth-chart',
  standalone: true,
  imports: [DashboardWidgetCardComponent],
  templateUrl: './investor-growth-chart.component.html',
  styleUrl: './investor-growth-chart.component.scss',
})
export class InvestorGrowthChartComponent implements AfterViewInit {
  readonly chartData = input<DashboardLineChartDto | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly chartLifecycle = new DashboardChartLifecycle(this.destroyRef);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly containerRef = viewChild.required<ElementRef<HTMLElement>>('chartContainer');
  private readonly viewReady = signal(false);

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

  private renderChart(data: DashboardLineChartDto | null): void {
    const categories = data?.categories ?? [];
    const series = data?.series?.[0];
    const values = series?.values.map((value) => value ?? 0) ?? [];

    if (!categories.length || !values.length) {
      this.chartLifecycle.destroy();
      return;
    }

    const canvas = this.canvasRef().nativeElement;
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const lineColor = dashboardLineSeriesColor(0);
    const fillGradient = context.createLinearGradient(0, 0, 0, 220);
    fillGradient.addColorStop(0, `${lineColor}38`);
    fillGradient.addColorStop(1, `${lineColor}00`);

    const maxValue = Math.max(...values, 0);
    const yMax = Math.max(45, Math.ceil(maxValue / 45) * 45);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: categories,
        datasets: [
          {
            label: series?.name ?? 'Investors',
            data: values,
            borderColor: lineColor,
            backgroundColor: fillGradient,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#fff',
            pointBorderColor: lineColor,
            pointBorderWidth: 2,
            pointHoverRadius: 5,
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a202c',
            padding: 10,
          },
        },
        scales: dashboardVerticalChartScales({
          yMax,
          yStep: yMax / 4,
        }),
      },
    };

    this.chartLifecycle.mount(canvas, this.containerRef().nativeElement, config);
  }
}
