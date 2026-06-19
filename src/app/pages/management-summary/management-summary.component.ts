import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
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
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { dashboardBarPieSeriesColor } from '../../features/capital-dashboard/dashboard/dashboard-chart-colors';
import {
  dashboardHorizontalBarChartScales,
  DashboardChartLifecycle,
} from '../../features/capital-dashboard/dashboard/dashboard-chart.util';
import type {
  ChartSlice,
  CmhcWatchlistRow,
  ExposureAnalysisRow,
  LoanAliasSummaryRow,
  ManagementSummaryFilters,
} from './management-summary.models';
import {
  MANAGEMENT_SUMMARY_INVESTOR_ALIAS_OPTIONS,
  MANAGEMENT_SUMMARY_MOCK_CAPITAL_STACK,
  MANAGEMENT_SUMMARY_MOCK_EXPOSURE_ANALYSIS,
  MANAGEMENT_SUMMARY_MOCK_EXPOSURE_BREAKDOWN,
  MANAGEMENT_SUMMARY_MOCK_INVESTOR_SUMMARY,
  MANAGEMENT_SUMMARY_MOCK_KPIS,
  MANAGEMENT_SUMMARY_MOCK_LOAN_ROWS,
  MANAGEMENT_SUMMARY_MOCK_LTV_RISK,
  MANAGEMENT_SUMMARY_MOCK_OUTSTANDING,
  MANAGEMENT_SUMMARY_MOCK_SPONSOR_SUMMARY,
  MANAGEMENT_SUMMARY_MOCK_TOP_EXPOSURES,
  MANAGEMENT_SUMMARY_MOCK_WATCHLIST,
  MANAGEMENT_SUMMARY_SPONSOR_OPTIONS,
} from './management-summary.mock';

Chart.register(...registerables);

@Component({
  selector: 'app-management-summary',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, MatIconModule],
  templateUrl: './management-summary.component.html',
  styleUrl: './management-summary.component.css',
})
export class ManagementSummaryComponent implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ltvRiskChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly top5Chart = new DashboardChartLifecycle(this.destroyRef);
  private readonly exposureBreakdownChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly capitalStackChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly investorChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly sponsorChart = new DashboardChartLifecycle(this.destroyRef);

  private readonly ltvRiskCanvas = viewChild<ElementRef<HTMLCanvasElement>>('ltvRiskCanvas');
  private readonly top5Canvas = viewChild<ElementRef<HTMLCanvasElement>>('top5Canvas');
  private readonly exposureBreakdownCanvas = viewChild<ElementRef<HTMLCanvasElement>>('exposureBreakdownCanvas');
  private readonly capitalStackCanvas = viewChild<ElementRef<HTMLCanvasElement>>('capitalStackCanvas');
  private readonly investorCanvas = viewChild<ElementRef<HTMLCanvasElement>>('investorCanvas');
  private readonly sponsorCanvas = viewChild<ElementRef<HTMLCanvasElement>>('sponsorCanvas');
  private readonly ltvRiskContainer = viewChild<ElementRef<HTMLElement>>('ltvRiskContainer');
  private readonly top5Container = viewChild<ElementRef<HTMLElement>>('top5Container');
  private readonly exposureBreakdownContainer = viewChild<ElementRef<HTMLElement>>('exposureBreakdownContainer');
  private readonly capitalStackContainer = viewChild<ElementRef<HTMLElement>>('capitalStackContainer');
  private readonly investorContainer = viewChild<ElementRef<HTMLElement>>('investorContainer');
  private readonly sponsorContainer = viewChild<ElementRef<HTMLElement>>('sponsorContainer');

  readonly asOfDisplay = signal('August 31, 2025');
  readonly reportPeriod = signal('Q3 2025');
  readonly filtersOpen = signal(false);

  readonly kpis = signal(MANAGEMENT_SUMMARY_MOCK_KPIS);
  readonly outstanding = signal(MANAGEMENT_SUMMARY_MOCK_OUTSTANDING);
  readonly loanRows = signal(MANAGEMENT_SUMMARY_MOCK_LOAN_ROWS);
  readonly watchlistRows = signal(MANAGEMENT_SUMMARY_MOCK_WATCHLIST);
  readonly ltvRiskBands = signal(MANAGEMENT_SUMMARY_MOCK_LTV_RISK);
  readonly topExposures = signal(MANAGEMENT_SUMMARY_MOCK_TOP_EXPOSURES);
  readonly exposureBreakdown = signal(MANAGEMENT_SUMMARY_MOCK_EXPOSURE_BREAKDOWN);
  readonly capitalStack = signal(MANAGEMENT_SUMMARY_MOCK_CAPITAL_STACK);
  readonly exposureAnalysis = signal(MANAGEMENT_SUMMARY_MOCK_EXPOSURE_ANALYSIS);
  readonly investorSummary = signal(MANAGEMENT_SUMMARY_MOCK_INVESTOR_SUMMARY);
  readonly sponsorSummary = signal(MANAGEMENT_SUMMARY_MOCK_SPONSOR_SUMMARY);

  readonly sponsorOptions = MANAGEMENT_SUMMARY_SPONSOR_OPTIONS;
  readonly investorAliasOptions = MANAGEMENT_SUMMARY_INVESTOR_ALIAS_OPTIONS;
  readonly riskOptions = ['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'] as const;
  readonly statusOptions = ['In Default', 'Watchlist', 'Performing', 'All'] as const;

  readonly filters = signal<ManagementSummaryFilters>({
    asOfDate: '2025-08-31',
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsor: 'All',
    riskLevels: ['ALL'],
    status: 'In Default',
    investorAliases: ['All'],
  });

  readonly loanTotals = computed(() => this.sumLoanRows(this.loanRows()));

  readonly exposureBreakdownTotal = computed(() =>
    this.exposureBreakdown().reduce((sum, slice) => sum + slice.value, 0),
  );

  readonly top5PortfolioShare = computed(() =>
    this.topExposures().reduce((sum, row) => sum + row.sharePercent, 0),
  );

  readonly exposureAnalysisTotals = computed(() => {
    const rows = this.exposureAnalysis();
    const sum = (key: keyof (typeof rows)[0]) =>
      rows.reduce((total, row) => total + (row[key] as number), 0);
    return {
      externalBalance: sum('externalBalance'),
      rmfBalance: sum('rmfBalance'),
      mlpBalance: sum('mlpBalance'),
      totalKsExposure: sum('totalKsExposure'),
      subordinateExposure: sum('subordinateExposure'),
    };
  });

  readonly watchlistConcernCount = computed(
    () => this.watchlistRows().filter((row) => row.status === 'CONCERN').length,
  );

  readonly watchlistNoConcernCount = computed(
    () => this.watchlistRows().filter((row) => row.status === 'NO CONCERNS').length,
  );

  ngAfterViewInit(): void {
    queueMicrotask(() => this.renderCharts());
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  closeFilters(): void {
    this.filtersOpen.set(false);
  }

  isRiskSelected(level: string): boolean {
    return this.filters().riskLevels.includes(level);
  }

  toggleRisk(level: string): void {
    this.filters.update((current) => {
      if (level === 'ALL') {
        return { ...current, riskLevels: ['ALL'] };
      }
      const withoutAll = current.riskLevels.filter((item) => item !== 'ALL');
      const next = withoutAll.includes(level)
        ? withoutAll.filter((item) => item !== level)
        : [...withoutAll, level];
      return { ...current, riskLevels: next.length ? next : ['ALL'] };
    });
  }

  setStatus(status: string): void {
    this.filters.update((current) => ({ ...current, status }));
  }

  isInvestorAliasSelected(alias: string): boolean {
    return this.filters().investorAliases.includes(alias);
  }

  toggleInvestorAlias(alias: string): void {
    this.filters.update((current) => {
      if (alias === 'All') {
        return { ...current, investorAliases: ['All'] };
      }
      const withoutAll = current.investorAliases.filter((item) => item !== 'All');
      const next = withoutAll.includes(alias)
        ? withoutAll.filter((item) => item !== alias)
        : [...withoutAll, alias];
      return { ...current, investorAliases: next.length ? next : ['All'] };
    });
  }

  updateFilterField<K extends keyof ManagementSummaryFilters>(key: K, value: ManagementSummaryFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  resetFilters(): void {
    this.filters.set({
      asOfDate: '2025-08-31',
      defaultDateFrom: '',
      defaultDateTo: '',
      maturityDateFrom: '',
      maturityDateTo: '',
      sponsor: 'All',
      riskLevels: ['ALL'],
      status: 'In Default',
      investorAliases: ['All'],
    });
  }

  applyFilters(): void {
    this.closeFilters();
  }

  openLoanDetail(row: LoanAliasSummaryRow): void {
    this.navigateToLoanDetail(row.loanAliasKey, row.loanAlias);
  }

  openExposureAnalysisDetail(row: ExposureAnalysisRow): void {
    this.navigateToLoanDetail(row.loanAliasKey, row.loanAlias);
  }

  private navigateToLoanDetail(loanAliasKey: number, loanAlias: string): void {
    void this.router.navigate(['/mortgage', 'management-summary', loanAliasKey, 'loan-detail'], {
      queryParams: { alias: loanAlias },
    });
  }

  formatMillions(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(0)}M`;
    }
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  riskClass(risk: string): string {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return 'ms-risk ms-risk--high';
      case 'ELEVATED':
        return 'ms-risk ms-risk--elevated';
      case 'MODERATE':
        return 'ms-risk ms-risk--moderate';
      case 'LOW':
        return 'ms-risk ms-risk--low';
      default:
        return 'ms-risk';
    }
  }

  sponsorLtvClass(ltv: number | null): string {
    if (ltv == null) {
      return '';
    }
    if (ltv > 100) {
      return 'ms-ltv ms-ltv--high';
    }
    if (ltv >= 75) {
      return 'ms-ltv ms-ltv--elevated';
    }
    if (ltv >= 50) {
      return 'ms-ltv ms-ltv--moderate';
    }
    return 'ms-ltv ms-ltv--low';
  }

  watchlistStatusClass(row: CmhcWatchlistRow): string {
    return row.status === 'CONCERN' ? 'ms-watch-status ms-watch-status--concern' : 'ms-watch-status ms-watch-status--ok';
  }

  missedClass(missed: number | null): string {
    if (missed == null || missed <= 0) {
      return 'ms-missed ms-missed--none';
    }
    if (missed >= 2) {
      return 'ms-missed ms-missed--high';
    }
    return 'ms-missed ms-missed--warn';
  }

  private sumLoanRows(rows: LoanAliasSummaryRow[]) {
    const sum = (key: keyof LoanAliasSummaryRow) =>
      rows.reduce((total, row) => {
        const value = row[key];
        return typeof value === 'number' ? total + value : total;
      }, 0);

    const principal = sum('principal');
    const ltv =
      rows.length && principal > 0
        ? rows.reduce((weighted, row) => weighted + (row.ltv ?? 0) * (row.principal ?? 0), 0) / principal
        : null;

    return {
      security: sum('security'),
      principal,
      osInt: sum('osInt'),
      accrued: sum('accrued'),
      lateInt: sum('lateInt'),
      taxIns: sum('taxIns'),
      intAdv: sum('intAdv'),
      other: sum('other'),
      totalExposure: sum('totalExposure'),
      ltv,
    };
  }

  private renderCharts(): void {
    this.renderDonut(
      this.ltvRiskCanvas()?.nativeElement,
      this.ltvRiskContainer()?.nativeElement,
      this.ltvRiskBands(),
      this.ltvRiskChart,
    );
    this.renderDonut(
      this.exposureBreakdownCanvas()?.nativeElement,
      this.exposureBreakdownContainer()?.nativeElement,
      this.exposureBreakdown(),
      this.exposureBreakdownChart,
    );
    this.renderDonut(
      this.capitalStackCanvas()?.nativeElement,
      this.capitalStackContainer()?.nativeElement,
      this.capitalStack(),
      this.capitalStackChart,
    );
    this.renderDonut(
      this.investorCanvas()?.nativeElement,
      this.investorContainer()?.nativeElement,
      this.investorSummary().map((row) => ({
        label: row.investor,
        value: row.exposure,
        sharePercent: row.sharePercent,
      })),
      this.investorChart,
    );
    this.renderDonut(
      this.sponsorCanvas()?.nativeElement,
      this.sponsorContainer()?.nativeElement,
      this.sponsorSummary().map((row) => ({
        label: row.sponsor,
        value: row.exposure,
        sharePercent: row.sharePercent,
      })),
      this.sponsorChart,
    );
    this.renderTop5Bar(
      this.top5Canvas()?.nativeElement,
      this.top5Container()?.nativeElement,
      this.topExposures(),
    );
  }

  private renderDonut(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement | undefined,
    slices: ChartSlice[],
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
          legend: { display: false },
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

  private renderTop5Bar(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement | undefined,
    rows: ReturnType<typeof this.topExposures>,
  ): void {
    if (!canvas || !container || !rows.length) {
      return;
    }

    const maxValue = Math.max(...rows.map((row) => row.exposure)) * 1.1;
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: rows.map((row) => row.loanAlias),
        datasets: [
          {
            data: rows.map((row) => row.exposure),
            backgroundColor: rows.map((_, index) => dashboardBarPieSeriesColor(index)),
            borderWidth: 0,
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
              label: (ctx) => {
                const row = rows[ctx.dataIndex];
                return ` ${this.formatMillions(row.exposure)} (${row.sharePercent.toFixed(1)}% of portfolio)`;
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

    this.top5Chart.mount(canvas, container, config);
  }
}
