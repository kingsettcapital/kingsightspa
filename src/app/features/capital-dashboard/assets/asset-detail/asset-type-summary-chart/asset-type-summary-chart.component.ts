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

import { dashboardBarPieSeriesColor } from '../../../dashboard/dashboard-chart-colors';
import { dashboardLegendLabels, scheduleChartResize } from '../../../dashboard/dashboard-chart.util';
import { AssetTypeSummaryRow } from '../../../shared/models/api.models';

Chart.register(...registerables);

@Component({
  selector: 'app-asset-type-summary-chart',
  standalone: true,
  templateUrl: './asset-type-summary-chart.component.html',
  styleUrl: './asset-type-summary-chart.component.scss',
})
export class AssetTypeSummaryChartComponent implements AfterViewInit, OnDestroy {
  readonly rows = input<AssetTypeSummaryRow[]>([]);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly viewReady = signal(false);
  private chart?: Chart;

  constructor() {
    effect(() => {
      if (!this.viewReady()) {
        return;
      }
      this.renderChart(this.rows());
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(rows: AssetTypeSummaryRow[]): void {
    const canvas = this.canvasRef().nativeElement;
    this.chart?.destroy();
    this.chart = undefined;

    const slices = rows.filter(
      (row) =>
        row.assetType &&
        row.assetType !== '—' &&
        row.grossLeasableAreaSqft != null &&
        row.grossLeasableAreaSqft > 0,
    );

    if (!slices.length) {
      return;
    }

    const totalGla = slices.reduce((sum, row) => sum + (row.grossLeasableAreaSqft ?? 0), 0);
    const sharePercents = slices.map((row) =>
      totalGla > 0 ? ((row.grossLeasableAreaSqft ?? 0) / totalGla) * 100 : 0,
    );

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: slices.map((row) => row.assetType),
        datasets: [
          {
            data: sharePercents,
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
              label: (ctx) => {
                const row = slices[ctx.dataIndex];
                if (!row) {
                  return ` ${ctx.label}: ${ctx.parsed.toFixed(1)}%`;
                }
                const lines = [
                  ` ${row.assetType}: ${ctx.parsed.toFixed(1)}% (${formatChartSqFt(row.grossLeasableAreaSqft)})`,
                  ` Committed: ${formatChartSqFt(row.committedAreaSqft)} (${formatPercent(row.occupancyRate)} occ.)`,
                  ` Vacant: ${formatChartSqFt(row.vacantAreaSqft)} (${formatPercent(row.vacancyRate)} vac.)`,
                ];
                return lines;
              },
            },
          },
        },
      },
    };

    this.chart = new Chart(canvas, config);
    scheduleChartResize(this.chart);
  }
}

function formatChartSqFt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M sf`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K sf`;
  }
  return `${Math.round(value).toLocaleString('en-US')} sf`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}
