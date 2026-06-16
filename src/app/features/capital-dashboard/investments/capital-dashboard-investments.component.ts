import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';

import { ExcelService } from '../../../core/services/excel.service';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { FUNDS_LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { FundsListQueryParams } from '../shared/models/api.models';
import { CapitalFundsApiService } from '../shared/services/capital-funds-api.service';
import { CapitalDashboardRouteSearchSync } from '../shared/utils/capital-dashboard-route-search.util';
import {
  EMPTY_FUNDS_FILTER_OPTIONS,
  FundsFilterOptions,
  normalizeFundsFilterOptions,
} from '../shared/utils/fund-filter-options.util';
import {
  buildFundsListCacheKey,
  defaultFundsSortDirection,
  formatInvestedPercent,
  FUNDS_TABLE_SORT_API_FIELDS,
  FundTableRow,
  FundsTableSortColumn,
  FundsTableSortDirection,
  mapFundListItemToRow,
} from '../shared/utils/fund-list-row.util';
import { FundsApiActions } from '../store';
import { selectFundsList } from '../store/capital-dashboard.selectors';

type TimeframeView = 'ltd' | 'quarterly';

const VISIBLE_PAGE_BUTTON_COUNT = 3;

@Component({
  selector: 'app-capital-dashboard-investments',
  standalone: true,
  imports: [FormsModule, MatIconModule, KsCurrencyPipe],
  templateUrl: './capital-dashboard-investments.component.html',
  styleUrl: './capital-dashboard-investments.component.scss',
})
export class CapitalDashboardInvestmentsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly excel = inject(ExcelService);
  private readonly fundsApi = inject(CapitalFundsApiService);
  private readonly routeSearchSync = inject(CapitalDashboardRouteSearchSync);

  private readonly listState = this.store.selectSignal(selectFundsList);

  readonly tableSearch = signal('');
  readonly timeframe = signal<TimeframeView>('ltd');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<FundsFilterOptions>(EMPTY_FUNDS_FILTER_OPTIONS);
  readonly fundTypeFilter = signal('all');
  readonly strategyFilter = signal('all');
  readonly filtersPanelVisible = signal(true);
  readonly sortColumn = signal<FundsTableSortColumn | null>(null);
  readonly sortDir = signal<FundsTableSortDirection>('desc');
  readonly currentPage = signal(1);

  readonly listLoading = computed(() => this.listState().loading);
  readonly listError = computed(() => this.listState().error);
  readonly totalCount = computed(() => this.listState().totalCount);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / FUNDS_LIST_PAGE_SIZE)),
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

  readonly periodLabel = computed(() => {
    if (this.timeframe() !== 'quarterly') {
      return 'ITD';
    }

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

  readonly subtitleText = computed(
    () => `${this.totalCount()} fund${this.totalCount() === 1 ? '' : 's'} · ${this.periodLabel()}`,
  );

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this.tableSearch().trim()) {
      count += 1;
    }
    if (this.fundTypeFilter() !== 'all') {
      count += 1;
    }
    if (this.strategyFilter() !== 'all') {
      count += 1;
    }
    return count;
  });

  readonly distributedColumnLabel = computed(() =>
    this.timeframe() === 'quarterly'
      ? `Net Distributed (${this.periodLabel()})`
      : 'Net Distributed (ITD)',
  );

  readonly rows = computed(() =>
    this.listState().items.map((item, index) => mapFundListItemToRow(item, index)),
  );

  readonly fundTypeOptions = computed(() => this.filterOptions().fundTypes);
  readonly strategyOptions = computed(() => this.filterOptions().strategies);

  readonly pageTotals = computed(() => {
    const rows = this.rows();
    return {
      commitment: rows.reduce((sum, row) => sum + row.commitment, 0),
      netInvestedCapital: rows.reduce((sum, row) => sum + row.netInvestedCapital, 0),
      netDistributed: rows.reduce((sum, row) => sum + row.netDistributed, 0),
      reservedUncalled: rows.reduce((sum, row) => sum + row.reservedUncalled, 0),
    };
  });

  readonly kpiCards = computed(() => {
    const summary = this.listState().summary;
    const total = this.totalCount();

    if (summary) {
      return {
        totalFunds: summary.totalFunds ?? total,
        totalCommitment: summary.totalCommitment ?? 0,
        netInvestedCapital: summary.netInvestedCapital ?? 0,
        netDistributed: summary.netDistributed ?? 0,
        reservedUncalled: summary.reservedUncalled ?? 0,
      };
    }

    const rows = this.rows();
    return {
      totalFunds: total,
      totalCommitment: rows.reduce((sum, row) => sum + row.commitment, 0),
      netInvestedCapital: rows.reduce((sum, row) => sum + row.netInvestedCapital, 0),
      netDistributed: rows.reduce((sum, row) => sum + row.netDistributed, 0),
      reservedUncalled: rows.reduce((sum, row) => sum + row.reservedUncalled, 0),
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
    this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * FUNDS_LIST_PAGE_SIZE + 1,
  );

  readonly showingTo = computed(() =>
    Math.min(this.currentPage() * FUNDS_LIST_PAGE_SIZE, this.totalCount()),
  );

  readonly formatInvestedPercent = formatInvestedPercent;

  constructor() {
    this.routeSearchSync.bindTableSearch(this.tableSearch, () => this.currentPage.set(1));

    this.fundsApi
      .getFilterOptions()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        const options = normalizeFundsFilterOptions(response);
        this.filterOptions.set(options);
        this.ensureQuarterlySelection(options);
      });

    effect(() => {
      this.timeframe();
      this.quarter();
      this.year();
      this.fundTypeFilter();
      this.strategyFilter();
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
    this.fundTypeFilter.set('all');
    this.strategyFilter.set('all');
    this.currentPage.set(1);
  }

  toggleSort(column: FundsTableSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDir.set(defaultFundsSortDirection(column));
    }
    this.currentPage.set(1);
  }

  isSortActive(column: FundsTableSortColumn): boolean {
    return this.sortColumn() === column;
  }

  sortIcon(column: FundsTableSortColumn): string {
    if (!this.isSortActive(column)) {
      return 'unfold_more';
    }
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  openInvestment(row: FundTableRow): void {
    void this.router.navigate(['/capital-dashboard/investment', row.fundKey], {
      state: { fundRow: row },
    });
  }

  retryLoad(): void {
    this.dispatchLoad(true);
  }

  downloadTable(): void {
    const rows = this.rows();
    if (!rows.length) {
      return;
    }

    this.excel.export<FundTableRow>({
      filename: 'investments',
      sheetName: 'Investments',
      columns: [
        { header: 'Fund Name', value: (row) => row.name },
        { header: 'Type', value: (row) => row.fundType },
        { header: 'Strategy', value: (row) => row.strategy },
        { header: 'Commitment', value: (row) => row.commitment },
        { header: 'Net Invested Capital', value: (row) => row.netInvestedCapital },
        { header: this.distributedColumnLabel(), value: (row) => row.netDistributed },
        { header: 'Reserved / Uncalled', value: (row) => row.reservedUncalled },
        { header: 'Released Capital', value: (row) => row.releasedCapital ?? '—' },
      ],
      rows,
    });
  }

  private dispatchLoad(replace: boolean): void {
    const activeSortColumn = this.sortColumn();
    const sortBy = activeSortColumn ? FUNDS_TABLE_SORT_API_FIELDS[activeSortColumn] : undefined;
    const sortDir = activeSortColumn ? this.sortDir() : undefined;
    const activeDateKey = this.timeframe() === 'quarterly' ? this.dateKey() : null;

    const cacheKey = buildFundsListCacheKey({
      view: this.timeframe(),
      dateKey: activeDateKey,
      fundType: this.fundTypeFilter(),
      strategy: this.strategyFilter(),
      sortBy: sortBy ?? null,
      sortDir: sortDir ?? null,
    });

    const apiParams: FundsListQueryParams = {
      view: this.timeframe(),
      page: this.currentPage(),
      pageSize: FUNDS_LIST_PAGE_SIZE,
      search: this.tableSearch().trim() || undefined,
      ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
      ...(activeDateKey != null ? { dateKey: activeDateKey } : {}),
      ...(this.fundTypeFilter() !== 'all' ? { fundType: this.fundTypeFilter() } : {}),
      ...(this.strategyFilter() !== 'all' ? { strategy: this.strategyFilter() } : {}),
    };

    this.store.dispatch(
      FundsApiActions.loadList({
        search: this.tableSearch().trim(),
        page: this.currentPage(),
        replace,
        cacheKey,
        apiParams,
      }),
    );
  }

  private ensureQuarterlySelection(options: FundsFilterOptions): void {
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
