import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { ManagementSummaryApiService } from '../../core/services/management-summary-api.service';
import {
  dashboardHorizontalBarChartScales,
  DashboardChartLifecycle,
} from '../../features/capital-dashboard/dashboard/dashboard-chart.util';
import { dashboardBarPieSeriesColor } from '../../features/capital-dashboard/dashboard/dashboard-chart-colors';
import type {
  ChartSlice,
  CmhcWatchlistRow,
  ExposureAnalysisRow,
  InvestorSummaryRow,
  LoanAliasSummaryRow,
  LtvRiskBandRow,
  ManagementSummaryFilters,
  ManagementSummaryKpis,
  OutstandingInterestSummary,
  SponsorSummaryRow,
  TopExposureRow,
} from './management-summary.models';
import { mapManagementSummaryDashboard } from './management-summary-dashboard.mapper';

Chart.register(...registerables);

@Component({
  selector: 'app-management-summary',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './management-summary.component.html',
  styleUrl: './management-summary.component.css',
})
export class ManagementSummaryComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly summaryApi = inject(ManagementSummaryApiService);
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

  readonly asOfDisplay = signal('');
  readonly reportPeriod = signal('');
  readonly filtersOpen = signal(false);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly kpis = signal<ManagementSummaryKpis>({
    numberOfLoans: 0,
    totalOutstandingBalance: 0,
    averageLtv: null,
    percentOfFundings: null,
  });
  readonly outstanding = signal<OutstandingInterestSummary>({
    interestDisbursed: 0,
    interestNotDisbursed: 0,
    totalOutstandingInterest: 0,
    totalLateInterest: 0,
  });
  readonly loanRows = signal<LoanAliasSummaryRow[]>([]);
  readonly loanSortColumn = signal<keyof LoanAliasSummaryRow | null>(null);
  readonly loanSortDir = signal<'asc' | 'desc'>('asc');
  readonly watchlistRows = signal<CmhcWatchlistRow[]>([]);
  readonly watchlistAsAtDisplay = signal('—');
  readonly ltvRiskBands = signal<LtvRiskBandRow[]>([]);
  readonly topExposures = signal<TopExposureRow[]>([]);
  readonly exposureBreakdown = signal<ChartSlice[]>([]);
  readonly capitalStack = signal<ChartSlice[]>([]);
  readonly exposureAnalysis = signal<ExposureAnalysisRow[]>([]);
  readonly investorSummary = signal<InvestorSummaryRow[]>([]);
  readonly sponsorSummary = signal<SponsorSummaryRow[]>([]);

  readonly sponsorOptions = signal<string[]>(['All']);
  readonly investorAliasOptions = signal<string[]>(['All']);
  readonly riskOptions = ['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'] as const;
  readonly statusOptions = signal<string[]>(['Default', 'All']);

  readonly filters = signal<ManagementSummaryFilters>(createDefaultFilters());

  readonly loanTotals = computed(() => this.sumLoanRows(this.loanRows()));

  readonly sortedLoanRows = computed(() => {
    const rows = [...this.loanRows()];
    const column = this.loanSortColumn();
    if (!column) {
      return rows;
    }
    const direction = this.loanSortDir() === 'asc' ? 1 : -1;
    const dateColumns = new Set<keyof LoanAliasSummaryRow>(['defaultDate', 'maturityDate']);
    rows.sort((left, right) => {
      const leftValue = left[column];
      const rightValue = right[column];
      if (leftValue == null && rightValue == null) {
        return 0;
      }
      if (leftValue == null || leftValue === '—') {
        return 1;
      }
      if (rightValue == null || rightValue === '—') {
        return -1;
      }
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * direction;
      }
      if (dateColumns.has(column)) {
        const leftTime = Date.parse(String(leftValue));
        const rightTime = Date.parse(String(rightValue));
        if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
          return (leftTime - rightTime) * direction;
        }
      }
      return (
        String(leftValue).localeCompare(String(rightValue), undefined, {
          sensitivity: 'base',
          numeric: true,
        }) * direction
      );
    });
    return rows;
  });

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

  readonly watchlistClaimExpectedCount = computed(
    () => this.watchlistRows().filter((row) => row.status === 'CLAIM EXPECTED').length,
  );

  readonly watchlistNoConcernCount = computed(
    () => this.watchlistRows().filter((row) => row.status === 'NO CONCERNS').length,
  );

  ngOnInit(): void {
    this.loadSummary();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.renderCharts());
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  closeFilters(): void {
    this.openFilterMenu.set(null);
    this.filtersOpen.set(false);
  }

  readonly selectedInvestorAlias = computed(() => this.filters().investorAliases[0] ?? 'All');
  readonly openFilterMenu = signal<'sponsor' | 'investor' | null>(null);

  toggleFilterMenu(menu: 'sponsor' | 'investor'): void {
    this.openFilterMenu.update((current) => (current === menu ? null : menu));
  }

  closeFilterMenus(): void {
    this.openFilterMenu.set(null);
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

  setSponsor(sponsor: string): void {
    this.updateFilterField('sponsor', sponsor || 'All');
    this.closeFilterMenus();
  }

  setInvestorAlias(alias: string): void {
    this.filters.update((current) => ({
      ...current,
      investorAliases: [alias || 'All'],
    }));
    this.closeFilterMenus();
  }

  updateFilterField<K extends keyof ManagementSummaryFilters>(key: K, value: ManagementSummaryFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  resetFilters(): void {
    this.filters.set(createDefaultFilters());
  }

  applyFilters(): void {
    this.closeFilters();
    this.loadSummary();
  }

  openLoanDetail(row: LoanAliasSummaryRow): void {
    this.navigateToLoanDetail(row.loanAliasKey, row.loanAlias);
  }

  sortLoanColumn(column: keyof LoanAliasSummaryRow): void {
    if (this.loanSortColumn() === column) {
      this.loanSortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.loanSortColumn.set(column);
    this.loanSortDir.set('asc');
  }

  loanSortIndicator(column: keyof LoanAliasSummaryRow): string {
    if (this.loanSortColumn() !== column) {
      return '↕';
    }
    return this.loanSortDir() === 'asc' ? '↑' : '↓';
  }

  openExposureAnalysisDetail(row: ExposureAnalysisRow): void {
    this.navigateToLoanDetail(row.loanAliasKey, row.loanAlias);
  }

  private loadSummary(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const filters = this.filters();
    const statuses =
      filters.status && filters.status !== 'All' ? [filters.status] : undefined;

    this.summaryApi
      .getDashboard({
        asOfDate: filters.asOfDate,
        defaultDateFrom: filters.defaultDateFrom || undefined,
        defaultDateTo: filters.defaultDateTo || undefined,
        maturityDateFrom: filters.maturityDateFrom || undefined,
        maturityDateTo: filters.maturityDateTo || undefined,
        sponsor: filters.sponsor,
        riskLevels: filters.riskLevels,
        statuses,
        investorAliases: filters.investorAliases,
      })
      .subscribe({
        next: (dto) => {
          const mapped = mapManagementSummaryDashboard(dto);
          this.asOfDisplay.set(mapped.asOfDisplay);
          this.reportPeriod.set(mapped.reportPeriod);
          this.kpis.set(mapped.kpis);
          this.outstanding.set(mapped.outstanding);
          this.loanRows.set(mapped.loanRows);
          this.watchlistRows.set(mapped.watchlistRows);
          this.watchlistAsAtDisplay.set(mapped.watchlistAsAt);
          this.ltvRiskBands.set(mapped.ltvRiskBands);
          this.topExposures.set(mapped.topExposures);
          this.exposureBreakdown.set(mapped.exposureBreakdown);
          this.capitalStack.set(mapped.capitalStack);
          this.exposureAnalysis.set(mapped.exposureAnalysis);
          this.investorSummary.set(mapped.investorSummary);
          this.sponsorSummary.set(mapped.sponsorSummary);
          this.sponsorOptions.set(mapped.sponsorOptions);
          this.investorAliasOptions.set(mapped.investorAliasOptions);
          this.statusOptions.set(mapped.statusOptions);
          this.isLoading.set(false);
          queueMicrotask(() => this.renderCharts());
        },
        error: () => {
          this.errorMessage.set('Unable to load management summary. Verify API availability.');
          this.isLoading.set(false);
        },
      });
  }

  private navigateToLoanDetail(loanAliasKey: number, loanAlias: string): void {
    void this.router.navigate(['/mortgage', 'management-summary', loanAliasKey, 'loan-detail'], {
      queryParams: { alias: loanAlias, asOfDate: this.filters().asOfDate },
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
    if (row.status === 'CLAIM EXPECTED') {
      return 'ms-watch-status ms-watch-status--claim';
    }
    if (row.status === 'CONCERN') {
      return 'ms-watch-status ms-watch-status--concern';
    }
    return 'ms-watch-status ms-watch-status--ok';
  }

  missedClass(missed: string | number | null): string {
    const numeric = typeof missed === 'number' ? missed : Number(missed);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return 'ms-missed ms-missed--none';
    }
    if (numeric >= 2) {
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

function defaultAsOfDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultFilters(): ManagementSummaryFilters {
  return {
    asOfDate: defaultAsOfDate(),
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsor: 'All',
    riskLevels: ['ALL'],
    status: 'Default',
    investorAliases: ['All'],
  };
}
