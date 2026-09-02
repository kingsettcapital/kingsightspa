import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';

import { ExcelService } from '../../../core/services/excel.service';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { INVESTORS_LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { InvestorsListQueryParams } from '../shared/models/api.models';
import { CapitalInvestorsApiService } from '../shared/services/capital-investors-api.service';
import { CapitalDashboardRouteSearchSync } from '../shared/utils/capital-dashboard-route-search.util';
import {
  EMPTY_INVESTORS_FILTER_OPTIONS,
  InvestorsFilterOptions,
  normalizeInvestorsFilterOptions,
} from '../shared/utils/investor-filter-options.util';
import {
  buildInvestorsListCacheKey,
  defaultInvestorsSortDirection,
  INVESTORS_TABLE_SORT_API_FIELDS,
  InvestorTableRow,
  InvestorsTableSortColumn,
  InvestorsTableSortDirection,
  mapInvestorListItemToRow,
} from '../shared/utils/investor-list-row.util';
import { InvestorsApiActions } from '../store';
import { selectInvestorsList } from '../store/capital-dashboard.selectors';

type TimeframeView = 'ltd' | 'quarterly';

const VISIBLE_PAGE_BUTTON_COUNT = 3;

@Component({
  selector: 'app-capital-dashboard-investors',
  standalone: true,
  imports: [FormsModule, MatIconModule, KsCurrencyPipe],
  templateUrl: './capital-dashboard-investors.component.html',
  styleUrl: './capital-dashboard-investors.component.scss',
})
export class CapitalDashboardInvestorsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly excel = inject(ExcelService);
  private readonly investorsApi = inject(CapitalInvestorsApiService);
  private readonly routeSearchSync = inject(CapitalDashboardRouteSearchSync);

  private readonly listState = this.store.selectSignal(selectInvestorsList);

  readonly tableSearch = signal('');
  readonly timeframe = signal<TimeframeView>('ltd');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<InvestorsFilterOptions>(EMPTY_INVESTORS_FILTER_OPTIONS);
  readonly investorTypeFilter = signal('all');
  readonly relationshipFilter = signal('all');
  readonly filtersPanelVisible = signal(true);
  readonly sortColumn = signal<InvestorsTableSortColumn | null>(null);
  readonly sortDir = signal<InvestorsTableSortDirection>('desc');
  readonly currentPage = signal(1);

  readonly listLoading = computed(() => this.listState().loading);
  readonly listError = computed(() => this.listState().error);
  readonly totalCount = computed(() => this.listState().totalCount);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / INVESTORS_LIST_PAGE_SIZE)),
  );

  readonly quarterlyPeriodOptions = computed(() => this.filterOptions().quarterlyPeriods);

  readonly dateKey = computed(() => {
    const quarter = this.quarter();
    const year = this.year();
    if (quarter == null || year == null) {
      return null;
    }

    return (
      this.quarterlyPeriodOptions().find(
        (period) => period.quarter === quarter && period.calendarYear === year,
      )?.dateKey ?? null
    );
  });

  /** All quarters present in filter-options (not scoped by year — year is scoped by quarter). */
  readonly availableQuarters = computed(() => {
    const periods = this.quarterlyPeriodOptions();
    return [...new Set(periods.map((period) => period.quarter))].sort((a, b) => a - b);
  });

  readonly availableYears = computed(() => {
    const periods = this.quarterlyPeriodOptions();
    const selectedQuarter = this.quarter();
    const scoped = selectedQuarter != null
      ? periods.filter((period) => period.quarter === selectedQuarter)
      : periods;

    return [...new Set(scoped.map((period) => period.calendarYear))].sort((a, b) => b - a);
  });

  readonly subtitleText = computed(
    () => `${this.totalCount()} investor${this.totalCount() === 1 ? '' : 's'}`,
  );

  readonly periodLabel = computed(() => {
    const quarter = this.quarter();
    const year = this.year();
    if (quarter == null || year == null) {
      return 'Quarterly';
    }

    const period = this.quarterlyPeriodOptions().find(
      (item) => item.quarter === quarter && item.calendarYear === year,
    );
    return period?.label ?? period?.quarterYear ?? `Q${quarter} ${year}`;
  });

  readonly reportingPeriodTitle = computed(() =>
    this.timeframe() === 'quarterly' ? this.periodLabel() : 'ITD',
  );

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.tableSearch().trim()) {
      count += 1;
    }
    if (this.investorTypeFilter() !== 'all') {
      count += 1;
    }
    if (this.relationshipFilter() !== 'all') {
      count += 1;
    }
    return count;
  });

  readonly distributedColumnLabel = 'Net Distributed';

  readonly rows = computed(() =>
    this.listState().items.map((item, index) => mapInvestorListItemToRow(item, index)),
  );

  readonly investorTypeOptions = computed(() => this.filterOptions().investorTypes);

  readonly relationshipOptions = computed(() => this.filterOptions().relationships);

  readonly pageTotals = computed(() => {
    const rows = this.rows();
    return {
      commitment: rows.reduce((sum, row) => sum + row.commitment, 0),
      netInvestedCapital: rows.reduce((sum, row) => sum + row.netInvestedCapital, 0),
      netDistributed: rows.reduce((sum, row) => sum + row.netDistributed, 0),
      reservedUncalled: rows.reduce((sum, row) => sum + row.reservedUncalled, 0),
      unfunded: rows.reduce((sum, row) => sum + row.unfunded, 0),
    };
  });

  readonly kpiCards = computed(() => {
    const summary = this.listState().summary;
    const total = this.totalCount();

    if (summary) {
      return {
        totalInvestors: summary.totalInvestors ?? total,
        totalCommitment: summary.totalCommitment ?? 0,
        netInvestedCapital: summary.netInvestedCapital ?? 0,
        netDistributed: summary.netDistributed ?? 0,
        reservedUncalled: summary.reservedUncalled ?? 0,
        unfunded: summary.unfunded ?? 0,
        releasedCapital: summary.releasedCapital ?? 0,
      };
    }

    const rows = this.rows();
    return {
      totalInvestors: total,
      totalCommitment: rows.reduce((sum, row) => sum + row.commitment, 0),
      netInvestedCapital: rows.reduce((sum, row) => sum + row.netInvestedCapital, 0),
      netDistributed: rows.reduce((sum, row) => sum + row.netDistributed, 0),
      reservedUncalled: rows.reduce((sum, row) => sum + row.reservedUncalled, 0),
      unfunded: rows.reduce((sum, row) => sum + row.unfunded, 0),
      releasedCapital: rows.reduce((sum, row) => sum + (row.releasedCapital ?? 0), 0),
    };
  });

  readonly pageNumbers = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();

    if (totalPages <= VISIBLE_PAGE_BUTTON_COUNT) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let start = Math.max(1, currentPage - 1);
    if (start + VISIBLE_PAGE_BUTTON_COUNT - 1 > totalPages) {
      start = totalPages - VISIBLE_PAGE_BUTTON_COUNT + 1;
    }

    return Array.from(
      { length: VISIBLE_PAGE_BUTTON_COUNT },
      (_, index) => start + index,
    );
  });

  readonly showingFrom = computed(() =>
    this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * INVESTORS_LIST_PAGE_SIZE + 1,
  );

  readonly showingTo = computed(() =>
    Math.min(this.currentPage() * INVESTORS_LIST_PAGE_SIZE, this.totalCount()),
  );

  constructor() {
    this.routeSearchSync.bindTableSearch(this.tableSearch, () => this.currentPage.set(1));

    this.investorsApi
      .getFilterOptions()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        const options = normalizeInvestorsFilterOptions(response);
        this.filterOptions.set(options);
        this.ensureQuarterlySelection(options);
      });

    effect(() => {
      this.timeframe();
      this.quarter();
      this.year();
      this.investorTypeFilter();
      this.relationshipFilter();
      this.sortColumn();
      this.sortDir();
      this.currentPage();
      if (this.timeframe() === 'quarterly' && this.dateKey() == null) {
        return;
      }
      this.dispatchLoad(true);
    });

    toObservable(this.tableSearch)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        this.currentPage.set(1);
        this.dispatchLoad(true);
      });
  }

  setTimeframe(view: TimeframeView): void {
    this.timeframe.set(view);
    if (view === 'quarterly') {
      this.ensureQuarterlySelection(this.filterOptions());
    }
    this.currentPage.set(1);
  }

  setQuarter(quarter: number): void {
    this.quarter.set(quarter);
    this.alignYearToQuarter();
    this.currentPage.set(1);
  }

  setYear(year: number): void {
    this.year.set(year);
    this.alignQuarterToYear();
    this.currentPage.set(1);
  }

  toggleFiltersPanel(): void {
    this.filtersPanelVisible.update((value) => !value);
  }

  clearAllFilters(): void {
    this.tableSearch.set('');
    this.investorTypeFilter.set('all');
    this.relationshipFilter.set('all');
    this.currentPage.set(1);
  }

  toggleSort(column: InvestorsTableSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDir.set(defaultInvestorsSortDirection(column));
    }
    this.currentPage.set(1);
  }

  isSortActive(column: InvestorsTableSortColumn): boolean {
    return this.sortColumn() === column;
  }

  sortIcon(column: InvestorsTableSortColumn): string | null {
    if (!this.isSortActive(column)) {
      return null;
    }
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  retryLoad(): void {
    this.dispatchLoad(true);
  }

  openInvestor(row: InvestorTableRow): void {
    void this.router.navigate(['/capital-dashboard/investor', row.investorKey], {
      state: {
        investorRow: row,
        reportingPeriod: this.reportingPeriodTitle(),
        listView: this.timeframe(),
        listQuarter: this.quarter(),
        listYear: this.year(),
      },
    });
  }

  downloadTable(): void {
    const rows = this.rows();
    if (!rows.length) {
      return;
    }

    this.excel.export<InvestorTableRow>({
      filename: 'investors',
      sheetName: 'Investors',
      columns: [
        { header: 'Investor Name', value: (row) => row.name },
        { header: 'Type', value: (row) => row.investorType },
        { header: 'Relationship', value: (row) => row.relationship },
        { header: 'Funds', value: (row) => row.fundsCount },
        { header: 'Commitment', value: (row) => row.commitment },
        { header: 'Net Invested Capital', value: (row) => row.netInvestedCapital },
        { header: this.distributedColumnLabel, value: (row) => row.netDistributed },
        { header: 'Reserved', value: (row) => row.reservedUncalled },
        { header: 'Unfunded', value: (row) => row.unfunded },
        { header: 'Released Capital', value: (row) => row.releasedCapital ?? '—' },
      ],
      rows,
    });
  }

  private dispatchLoad(replace: boolean): void {
    const activeSortColumn = this.sortColumn();
    const sortBy = activeSortColumn
      ? INVESTORS_TABLE_SORT_API_FIELDS[activeSortColumn]
      : undefined;
    const sortDir = activeSortColumn ? this.sortDir() : undefined;

    const activeDateKey = this.timeframe() === 'quarterly' ? this.dateKey() : null;

    const cacheKey = buildInvestorsListCacheKey({
      view: this.timeframe(),
      dateKey: activeDateKey,
      investorType: this.investorTypeFilter(),
      relationship: this.relationshipFilter(),
      sortBy: sortBy ?? null,
      sortDir: sortDir ?? null,
    });

    const apiParams: InvestorsListQueryParams = {
      view: this.timeframe(),
      page: this.currentPage(),
      pageSize: INVESTORS_LIST_PAGE_SIZE,
      search: this.tableSearch().trim() || undefined,
      ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
      ...(activeDateKey != null ? { dateKey: activeDateKey } : {}),
      ...(this.investorTypeFilter() !== 'all'
        ? { investorType: this.investorTypeFilter() }
        : {}),
      ...(this.relationshipFilter() !== 'all'
        ? { relationship: this.relationshipFilter() }
        : {}),
    };

    this.store.dispatch(
      InvestorsApiActions.loadList({
        search: this.tableSearch().trim(),
        page: this.currentPage(),
        replace,
        cacheKey,
        apiParams,
      }),
    );
  }

  private ensureQuarterlySelection(options: InvestorsFilterOptions): void {
    const periods = options.quarterlyPeriods;
    if (!periods.length) {
      this.quarter.set(null);
      this.year.set(null);
      return;
    }

    const quarter = this.quarter();
    const year = this.year();
    if (
      quarter != null &&
      year != null &&
      periods.some((period) => period.quarter === quarter && period.calendarYear === year)
    ) {
      return;
    }

    const first = periods[0];
    this.quarter.set(first.quarter);
    this.year.set(first.calendarYear);
  }

  private alignYearToQuarter(): void {
    const years = this.availableYears();
    const currentYear = this.year();
    if (currentYear == null || !years.includes(currentYear)) {
      this.year.set(years[0] ?? null);
    }
  }

  private alignQuarterToYear(): void {
    const quarters = this.availableQuarters();
    const currentQuarter = this.quarter();
    if (currentQuarter == null || !quarters.includes(currentQuarter)) {
      this.quarter.set(quarters[0] ?? null);
    }
  }
}
