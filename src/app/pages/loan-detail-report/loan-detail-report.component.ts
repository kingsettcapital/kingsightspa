import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { combineLatest } from 'rxjs';

import { ManagementSummaryApiService } from '../../core/services/management-summary-api.service';
import { ManagementSummaryFilterStateService } from '../../core/services/management-summary-filter-state.service';
import { ReportPrintExportService } from '../../core/services/report-print-export.service';
import { extractApiError } from '../../core/utils/api-error.util';
import { mapLoanDetailReportDashboard } from './loan-detail-report.mapper';
import {
  DashboardChartLifecycle,
} from '../../features/capital-dashboard/dashboard/dashboard-chart.util';
import { dashboardBarPieSeriesColor } from '../../features/capital-dashboard/dashboard/dashboard-chart-colors';
import type { ManagementSummaryFilters } from '../management-summary/management-summary.models';
import {
  createLoanDetailDefaultFilters,
  filtersToQueryParams,
  formatActiveFiltersDisplay,
  investorAliasesFromFilters,
  loanDetailFiltersFromQuery,
  statusesFromFilters,
} from '../management-summary/management-summary-filter.util';
import type { LoanDetailReportData, LoanPortfolioDetailRow } from './loan-detail-report.models';

Chart.register(...registerables);

type PortfolioSortColumn =
  | 'loanId'
  | 'description'
  | 'investor'
  | 'rank'
  | 'rate'
  | 'principal'
  | 'defInterest'
  | 'accruedInt'
  | 'lateInt'
  | 'intAdj'
  | 'taxArrears'
  | 'otherCosts'
  | 'totalExposure'
  | 'ltv'
  | 'monthsInArrears';

const PORTFOLIO_TEXT_SORT_COLUMNS = new Set<PortfolioSortColumn>([
  'loanId',
  'description',
  'investor',
]);

/** Rows included in the grid and totals (syndicate / main — excludes whole loan). */
function isPortfolioAggregateRow(row: LoanPortfolioDetailRow): boolean {
  return row.aggregateFlag?.trim().toUpperCase() === 'Y';
}

function rankSortValue(rank: string): number {
  const trimmed = rank.trim();
  if (!trimmed || trimmed === '—') {
    return Number.POSITIVE_INFINITY;
  }
  const numeric = Number(trimmed.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

@Component({
  selector: 'app-loan-detail-report',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  templateUrl: './loan-detail-report.component.html',
  styleUrl: './loan-detail-report.component.css',
})
export class LoanDetailReportComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly summaryApi = inject(ManagementSummaryApiService);
  private readonly filterState = inject(ManagementSummaryFilterStateService);
  private readonly reportPrintExport = inject(ReportPrintExportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly compositionChart = new DashboardChartLifecycle(this.destroyRef);
  private readonly breakdownChart = new DashboardChartLifecycle(this.destroyRef);

  private readonly compositionCanvas = viewChild<ElementRef<HTMLCanvasElement>>('compositionCanvas');
  private readonly breakdownCanvas = viewChild<ElementRef<HTMLCanvasElement>>('breakdownCanvas');
  private readonly compositionChartContainer = viewChild<ElementRef<HTMLElement>>('compositionChartContainer');
  private readonly breakdownChartContainer = viewChild<ElementRef<HTMLElement>>('breakdownChartContainer');
  private readonly reportRoot = viewChild<ElementRef<HTMLElement>>('reportRoot');

  private loanAliasKey = 0;
  private loanAliasName = '';

  readonly report = signal<LoanDetailReportData>(
    mapLoanDetailReportDashboard({
      loanAlias: '—',
      header: {},
      reportDetails: {},
      keyDates: {
        asOfDate: new Date().toISOString().slice(0, 10),
        ltvAsOfDate: '—',
        isLtvConfirmed: false,
      },
      propertyStats: {},
      interestSummary: {},
      interestReserve: {},
      portfolioRows: [],
    }),
  );
  readonly isLoading = signal(false);
  readonly isExporting = signal(false);
  readonly errorMessage = signal('');
  readonly filtersOpen = signal(false);
  /** Loan Detail local filters — not written back to Management Summary session. */
  readonly filters = signal<ManagementSummaryFilters>(
    createLoanDetailDefaultFilters(this.filterState.getFilters().asOfDate),
  );
  readonly openFilterMenu = signal<'sponsor' | 'investor' | null>(null);

  /** Face-of-report active filters (skips All / empty). */
  readonly activeFiltersDisplay = computed(() => formatActiveFiltersDisplay(this.filters()));

  readonly riskOptions = ['ALL', 'HIGH', 'ELEVATED', 'MODERATE', 'LOW'] as const;
  readonly sponsorOptions = signal<string[]>(this.filterState.getFilterOptions().sponsors);
  readonly investorAliasOptions = signal<string[]>(this.filterState.getFilterOptions().investorAliases);
  readonly statusOptions = signal<string[]>(this.filterState.getFilterOptions().statuses);

  readonly selectedInvestorAlias = computed(() => this.filters().investorAliases[0] ?? 'All');

  /** Syndicate + main loans only (aggregate_flag = Y); whole loan excluded. */
  readonly portfolioDisplayRows = computed(() =>
    this.report().portfolioRows.filter(isPortfolioAggregateRow),
  );

  readonly portfolioSortColumn = signal<PortfolioSortColumn>('rank');
  readonly portfolioSortDirection = signal<'asc' | 'desc'>('asc');

  readonly sortedPortfolioRows = computed(() => {
    const rows = [...this.portfolioDisplayRows()];
    const column = this.portfolioSortColumn();
    const direction = this.portfolioSortDirection() === 'asc' ? 1 : -1;

    rows.sort((left, right) => this.comparePortfolioRows(left, right, column) * direction);
    return rows;
  });

  readonly portfolioTotals = computed(() => this.sumPortfolioRows(this.portfolioDisplayRows()));

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

  readonly compositionLegend = computed(() => this.knownSlices(this.report().exposureComposition));
  readonly investorLegend = computed(() => this.knownSlices(this.report().exposureByInvestor));

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, query]) => {
      const loanAliasKey = Number(params.get('loanAliasKey'));
      const alias = String(query.get('alias') ?? '').trim();
      if (!Number.isFinite(loanAliasKey) || loanAliasKey <= 0) {
        return;
      }

      // Detach from MS filters: only As Of is shared; other filters default to All.
      const fallbackAsOf = this.filterState.getFilters().asOfDate;
      const loanFilters = loanDetailFiltersFromQuery(query, fallbackAsOf);
      this.filters.set(loanFilters);
      this.loanAliasKey = loanAliasKey;
      this.loanAliasName = alias;
      this.hydrateFilterOptions(loanFilters.asOfDate);
      this.loadReport();
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.renderCharts());
  }

  ngOnDestroy(): void {
    // Do not overwrite Management Summary session filters.
  }

  async exportPdf(): Promise<void> {
    const root = this.reportRoot()?.nativeElement;
    if (!root || this.isExporting()) {
      return;
    }
    this.filtersOpen.set(false);
    this.isExporting.set(true);
    try {
      // Ensure charts are painted circular before canvas pixels are cloned into the PDF.
      this.renderCharts();
      await new Promise<void>((resolve) => setTimeout(resolve, 80));
      const alias = this.report().loanAlias.replace(/\W+/g, '-') || 'loan';
      const asOf = this.report().keyDates.asOfDate.replace(/\W+/g, '-') || 'report';
      await this.reportPrintExport.exportElementToPdf(root, `loan-portfolio-detail-${alias}-${asOf}.pdf`);
    } finally {
      this.isExporting.set(false);
    }
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  closeFilters(): void {
    this.openFilterMenu.set(null);
    this.filtersOpen.set(false);
  }

  toggleFilterMenu(menu: 'sponsor' | 'investor'): void {
    this.openFilterMenu.update((current) => (current === menu ? null : menu));
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
      const nextLevels = withoutAll.includes(level)
        ? withoutAll.filter((item) => item !== level)
        : [...withoutAll, level];
      return { ...current, riskLevels: nextLevels.length ? nextLevels : ['ALL'] };
    });
  }

  setStatus(status: string): void {
    this.updateFilterField('status', status);
  }

  setSponsor(sponsor: string): void {
    this.updateFilterField('sponsor', sponsor || 'All');
    this.openFilterMenu.set(null);
  }

  setInvestorAlias(alias: string): void {
    this.filters.update((current) => ({
      ...current,
      investorAliases: [alias || 'All'],
    }));
    this.openFilterMenu.set(null);
  }

  updateFilterField<K extends keyof ManagementSummaryFilters>(key: K, value: ManagementSummaryFilters[K]): void {
    this.filters.update((current) => ({ ...current, [key]: value }));
  }

  resetFilters(): void {
    this.filters.set(createLoanDetailDefaultFilters(this.filters().asOfDate));
  }

  applyFilters(): void {
    const next = this.filters();
    this.closeFilters();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: filtersToQueryParams(next, this.loanAliasName || this.report().loanAlias),
      replaceUrl: true,
    });
  }

  /** Return to Management Summary without overwriting its session filters. */
  backToManagementSummary(): void {
    // no-op: MS filters remain in ManagementSummaryFilterStateService
  }

  private loadReport(): void {
    if (this.loanAliasKey <= 0) {
      return;
    }
    const filters = this.filters();
    const statuses = statusesFromFilters(filters);
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.summaryApi
      .getLoanDetailReport(this.loanAliasKey, {
        asOfDate: filters.asOfDate,
        defaultDateFrom: filters.defaultDateFrom || undefined,
        defaultDateTo: filters.defaultDateTo || undefined,
        maturityDateFrom: filters.maturityDateFrom || undefined,
        maturityDateTo: filters.maturityDateTo || undefined,
        sponsor: filters.sponsor,
        riskLevels: filters.riskLevels,
        statuses,
        investorAliases: investorAliasesFromFilters(filters),
      })
      .subscribe({
        next: (dto) => {
          const mapped = mapLoanDetailReportDashboard(dto);
          this.report.set({
            ...mapped,
            loanAlias: this.loanAliasName || mapped.loanAlias,
          });
          this.isLoading.set(false);
          queueMicrotask(() => this.renderCharts());
        },
        error: (err) => {
          this.errorMessage.set(
            extractApiError(err, 'Unable to load loan detail report. Verify API availability.'),
          );
          this.isLoading.set(false);
        },
      });
  }

  /** Ensure Status / Sponsor / Investor options exist even on deep-link into detail. */
  private hydrateFilterOptions(asOfDate: string): void {
    const existing = this.filterState.getFilterOptions();
    const hasStatuses = existing.statuses.some((s) => s.toLowerCase() !== 'all');
    if (hasStatuses && existing.sponsors.length > 1) {
      this.sponsorOptions.set(existing.sponsors);
      this.investorAliasOptions.set(existing.investorAliases);
      this.statusOptions.set(existing.statuses);
      return;
    }

    this.summaryApi
      .getDashboard({
        asOfDate,
        statuses: statusesFromFilters(this.filters()),
      })
      .subscribe({
        next: (dto) => {
          const sponsors = ['All', ...(dto.filterOptions?.sponsors ?? []).filter((s) => s !== 'All')];
          const investors = [
            'All',
            ...(dto.filterOptions?.investorAliases ?? []).filter((s) => s !== 'All'),
          ];
          const fromApi = (dto.filterOptions?.statuses ?? []).filter((s) => !!s?.trim());
          const withoutAll = fromApi.filter((s) => s.toLowerCase() !== 'all');
          const statuses =
            withoutAll.length > 0 ? [...withoutAll, 'All'] : ['Default', 'Funded', 'Unfunded', 'Repaid', 'All'];
          this.filterState.saveFilterOptions({
            sponsors,
            investorAliases: investors,
            statuses,
          });
          this.sponsorOptions.set(sponsors);
          this.investorAliasOptions.set(investors);
          this.statusOptions.set(statuses);
        },
      });
  }

  /** Compact amounts for pictorial charts/tables: millions → M, thousands → K. */
  formatMillions(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    const format = (amount: number) =>
      new Intl.NumberFormat('en-CA', {
        maximumFractionDigits: 0,
      }).format(amount);

    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      return `${format(Math.round(value / 1_000_000))}M`;
    }
    if (abs >= 1_000) {
      return `${format(Math.round(value / 1_000))}K`;
    }
    return format(value);
  }

  chartSeriesColor(index: number): string {
    return dashboardBarPieSeriesColor(index);
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
    // Display and TOTALS both use syndicate/main rows only (aggregate_flag = Y).
    const totalRows = rows;
    const sum = (key: keyof LoanPortfolioDetailRow) =>
      totalRows.reduce((total, row) => {
        const value = row[key];
        return typeof value === 'number' ? total + value : total;
      }, 0);

    const principal = sum('principal');
    const totalExposure = sum('totalExposure');
    const ltv =
      totalRows.length && principal > 0
        ? totalRows.reduce((weighted, row) => weighted + (row.ltv ?? 0) * (row.principal ?? 0), 0) /
          principal
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

  togglePortfolioSort(column: PortfolioSortColumn): void {
    if (this.portfolioSortColumn() === column) {
      this.portfolioSortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }
    this.portfolioSortColumn.set(column);
    this.portfolioSortDirection.set('asc');
  }

  portfolioSortIndicator(column: PortfolioSortColumn): string {
    if (this.portfolioSortColumn() !== column) {
      return '';
    }
    return this.portfolioSortDirection() === 'asc' ? '↑' : '↓';
  }

  private comparePortfolioRows(
    left: LoanPortfolioDetailRow,
    right: LoanPortfolioDetailRow,
    column: PortfolioSortColumn,
  ): number {
    if (column === 'rank') {
      return rankSortValue(left.rank) - rankSortValue(right.rank);
    }

    if (PORTFOLIO_TEXT_SORT_COLUMNS.has(column)) {
      const leftText = String(left[column] ?? '');
      const rightText = String(right[column] ?? '');
      return leftText.localeCompare(rightText, undefined, { sensitivity: 'base', numeric: true });
    }

    const leftValue = left[column];
    const rightValue = right[column];
    const leftNum = typeof leftValue === 'number' && Number.isFinite(leftValue) ? leftValue : null;
    const rightNum = typeof rightValue === 'number' && Number.isFinite(rightValue) ? rightValue : null;

    if (leftNum == null && rightNum == null) {
      return 0;
    }
    if (leftNum == null) {
      return 1;
    }
    if (rightNum == null) {
      return -1;
    }
    return leftNum - rightNum;
  }

  private renderCharts(): void {
    this.renderDonut(
      this.compositionCanvas()?.nativeElement,
      this.compositionChartContainer()?.nativeElement,
      this.compositionLegend(),
      this.compositionChart,
    );
    this.renderStackedInvestorBar(
      this.breakdownCanvas()?.nativeElement,
      this.breakdownChartContainer()?.nativeElement,
      this.investorLegend(),
      this.breakdownChart,
    );
  }

  private knownSlices(
    slices: LoanDetailReportData['exposureByInvestor'],
  ): LoanDetailReportData['exposureByInvestor'] {
    const filtered = slices.filter((slice) => {
      const label = slice.label.trim().toLowerCase();
      return label && label !== 'unknown' && label !== '(unknown)';
    });
    const total = filtered.reduce((sum, slice) => sum + slice.value, 0);
    return filtered.map((slice) => ({
      ...slice,
      sharePercent: total > 0 ? (slice.value / total) * 100 : 0,
    }));
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
        maintainAspectRatio: true,
        aspectRatio: 1,
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

  private renderStackedInvestorBar(
    canvas: HTMLCanvasElement | undefined,
    container: HTMLElement | undefined,
    slices: LoanDetailReportData['exposureByInvestor'],
    lifecycle: DashboardChartLifecycle,
  ): void {
    if (!canvas || !container || !slices.length) {
      return;
    }

    const total = slices.reduce((sum, slice) => sum + slice.value, 0);

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: ['Exposure'],
        datasets: slices.map((slice, index) => ({
          label: `${slice.label} — ${this.formatMillions(slice.value)} (${slice.sharePercent.toFixed(1)}%)`,
          data: [slice.value],
          backgroundColor: dashboardBarPieSeriesColor(index),
          borderWidth: 0,
          barThickness: 42,
        })),
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
                const slice = slices[ctx.datasetIndex];
                return ` ${slice.label}: ${this.formatMillions(slice.value)} (${slice.sharePercent.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            max: total > 0 ? total * 1.05 : undefined,
            ticks: {
              callback: (value) => this.formatMillions(Number(value)),
            },
          },
          y: {
            stacked: true,
          },
        },
      },
    };

    lifecycle.mount(canvas, container, config);
  }
}
