import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { combineLatest } from 'rxjs';

import { ManagementSummaryApiService } from '../../core/services/management-summary-api.service';
import { mapLoanDetailReportDashboard } from './loan-detail-report.mapper';
import {
  dashboardHorizontalBarChartScales,
  dashboardLegendLabels,
  DashboardChartLifecycle,
} from '../../features/capital-dashboard/dashboard/dashboard-chart.util';
import { dashboardBarPieSeriesColor } from '../../features/capital-dashboard/dashboard/dashboard-chart-colors';
import type { LoanDetailReportData, LoanPortfolioDetailRow } from './loan-detail-report.models';

Chart.register(...registerables);

@Component({
  selector: 'app-loan-detail-report',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './loan-detail-report.component.html',
  styleUrl: './loan-detail-report.component.css',
})
export class LoanDetailReportComponent implements AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly summaryApi = inject(ManagementSummaryApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly investorChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly compositionChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly breakdownChart = new DashboardChartLifecycle(this.destroyRef);

  private readonly investorCanvas = viewChild<ElementRef<HTMLCanvasElement>>('investorCanvas');
  private readonly compositionCanvas = viewChild<ElementRef<HTMLCanvasElement>>('compositionCanvas');
  private readonly breakdownCanvas = viewChild<ElementRef<HTMLCanvasElement>>('breakdownCanvas');
  private readonly investorChartContainer = viewChild<ElementRef<HTMLElement>>('investorChartContainer');
  private readonly compositionChartContainer = viewChild<ElementRef<HTMLElement>>('compositionChartContainer');
  private readonly breakdownChartContainer = viewChild<ElementRef<HTMLElement>>('breakdownChartContainer');

  readonly report = signal<LoanDetailReportData>(
    mapLoanDetailReportDashboard({
      loanAlias: '—',
      header: {},
      reportDetails: {},
      keyDates: { asOfDate: new Date().toISOString().slice(0, 10) },
      propertyStats: {},
      interestSummary: {},
      interestReserve: {},
      portfolioRows: [],
    }),
  );
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly portfolioTotals = computed(() => this.sumPortfolioRows(this.report().portfolioRows));

  readonly totalExposureDisplay = computed(() => {
    const total = this.portfolioTotals().totalExposure;
    if (total == null) {
      return '—';
    }
    return this.formatMillions(total);
  });

  readonly taxArrearsTotal = computed(() =>
    this.report().taxArrearsByYear.reduce((sum, row) => sum + row.taxArrears, 0),
  );

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      const loanAliasKey = Number(params.get('loanAliasKey'));
      const alias = String(query.get('alias') ?? '').trim();
      const asOfDate = String(query.get('asOfDate') ?? defaultAsOfDate()).trim();
      if (!Number.isFinite(loanAliasKey) || loanAliasKey <= 0) {
        return;
      }
      this.loadReport(loanAliasKey, alias, asOfDate);
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.renderCharts());
  }

  private loadReport(loanAliasKey: number, loanAlias: string, asOfDate: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.summaryApi.getLoanDetailReport(loanAliasKey, asOfDate).subscribe({
      next: (dto) => {
        const mapped = mapLoanDetailReportDashboard(dto);
        this.report.set({
          ...mapped,
          loanAlias: loanAlias || mapped.loanAlias,
        });
        this.isLoading.set(false);
        queueMicrotask(() => this.renderCharts());
      },
      error: () => {
        this.errorMessage.set('Unable to load loan detail report. Verify API availability.');
        this.isLoading.set(false);
      },
    });
  }

  formatMillions(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    const format = (amount: number) =>
      new Intl.NumberFormat('en-CA', {
        maximumFractionDigits: 0,
      }).format(amount);

    if (Math.abs(value) >= 1_000_000) {
      return `${format(Math.round(value / 1_000_000))}M`;
    }
    return format(value);
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatRate(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return `${value.toFixed(2)}%`;
  }

  formatLtv(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return `${value.toFixed(1)}%`;
  }

  riskClass(risk: string): string {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return 'ldr-risk ldr-risk--high';
      case 'ELEVATED':
        return 'ldr-risk ldr-risk--elevated';
      case 'MODERATE':
        return 'ldr-risk ldr-risk--moderate';
      case 'LOW':
        return 'ldr-risk ldr-risk--low';
      default:
        return 'ldr-risk';
    }
  }

  private sumPortfolioRows(rows: LoanPortfolioDetailRow[]) {
    const sum = (key: keyof LoanPortfolioDetailRow) =>
      rows.reduce((total, row) => {
        const value = row[key];
        return typeof value === 'number' ? total + value : total;
      }, 0);

    const principal = sum('principal');
    const totalExposure = sum('totalExposure');
    const ltv =
      rows.length && principal > 0
        ? rows.reduce((weighted, row) => weighted + (row.ltv ?? 0) * (row.principal ?? 0), 0) / principal
        : null;

    return {
      principal,
      defInterest: sum('defInterest'),
      accruedInt: sum('accruedInt'),
      lateInt: sum('lateInt'),
      intAdj: sum('intAdj'),
      taxArrears: sum('taxArrears'),
      otherCosts: sum('otherCosts'),
      totalExposure,
      ltv,
    };
  }

  private renderCharts(): void {
    const data = this.report();
    this.renderDonut(
      this.investorCanvas()?.nativeElement,
      this.investorChartContainer()?.nativeElement,
      data.exposureByInvestor,
      this.investorChart,
    );
    this.renderDonut(
      this.compositionCanvas()?.nativeElement,
      this.compositionChartContainer()?.nativeElement,
      data.exposureComposition,
      this.compositionChart,
    );
    this.renderHorizontalBar(
      this.breakdownCanvas()?.nativeElement,
      this.breakdownChartContainer()?.nativeElement,
      data.investorBreakdown,
      this.breakdownChart,
    );
  }

  private renderDonut(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement | undefined,
    slices: LoanDetailReportData['exposureByInvestor'],
    lifecycle: DashboardChartLifecycle,
  ): void {
    if (!canvas || !container || !slices.length) {
      return;
    }

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: slices.map((item) => item.label),
        datasets: [
          {
            data: slices.map((item) => item.value),
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
                const slice = slices[ctx.dataIndex];
                return ` ${slice.label}: ${this.formatMillions(slice.value)} (${slice.sharePercent.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    };

    lifecycle.mount(canvas, container, config);
  }

  private renderHorizontalBar(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement | undefined,
    slices: LoanDetailReportData['investorBreakdown'],
    lifecycle: DashboardChartLifecycle,
  ): void {
    if (!canvas || !container || !slices.length) {
      return;
    }

    const maxValue = Math.max(...slices.map((item) => item.value)) * 1.1;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: slices.map((item) => item.label),
        datasets: [
          {
            data: slices.map((item) => item.value),
            backgroundColor: slices.map((_, index) => dashboardBarPieSeriesColor(index)),
            borderWidth: 0,
            barThickness: 18,
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
              label: (ctx) => {
                const slice = slices[ctx.dataIndex];
                return ` ${this.formatMillions(slice.value)} (${slice.sharePercent.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: dashboardHorizontalBarChartScales({
          xMax: maxValue,
          xTickCallback: (value) => this.formatMillions(Number(value)),
        }),
      },
    };

    lifecycle.mount(canvas, container, config);
  }
}

function defaultAsOfDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
