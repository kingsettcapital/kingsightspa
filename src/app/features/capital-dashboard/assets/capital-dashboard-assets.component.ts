import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of } from 'rxjs';

import { ExcelService } from '../../../core/services/excel.service';
import { ASSETS_LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { AssetsQueryParams } from '../shared/models/api.models';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { CapitalDashboardRouteSearchSync } from '../shared/utils/capital-dashboard-route-search.util';
import {
  ASSETS_TABLE_SORT_API_FIELDS,
  AssetTableRow,
  AssetsTableSortColumn,
  AssetsTableSortDirection,
  buildAssetsListCacheKey,
  defaultAssetsSortDirection,
  formatAreaNumber,
  formatSquareFeet,
  mapPropertyListItemToRow,
} from '../shared/utils/asset-list-row.util';
import {
  AssetsFilterOptions,
  EMPTY_ASSETS_FILTER_OPTIONS,
  normalizeAssetsFilterOptions,
} from '../shared/utils/asset-filter-options.util';
import { AssetsApiActions } from '../store';
import { selectAssetsList } from '../store/capital-dashboard.selectors';

type TimeframeView = 'ltd' | 'quarterly';

const VISIBLE_PAGE_BUTTON_COUNT = 3;

@Component({
  selector: 'app-capital-dashboard-assets',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  templateUrl: './capital-dashboard-assets.component.html',
  styleUrl: './capital-dashboard-assets.component.scss',
})
export class CapitalDashboardAssetsComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly excel = inject(ExcelService);
  private readonly assetsApi = inject(CapitalAssetsApiService);
  private readonly routeSearchSync = inject(CapitalDashboardRouteSearchSync);

  private readonly listState = this.store.selectSignal(selectAssetsList);

  readonly tableSearch = signal('');
  readonly timeframe = signal<TimeframeView>('ltd');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<AssetsFilterOptions>(EMPTY_ASSETS_FILTER_OPTIONS);
  readonly assetTypeFilter = signal('all');
  readonly investmentTypeFilter = signal('all');
  readonly geographyFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly filtersPanelVisible = signal(true);
  readonly sortColumn = signal<AssetsTableSortColumn | null>('glaSf');
  readonly sortDir = signal<AssetsTableSortDirection>('desc');
  readonly currentPage = signal(1);

  readonly listLoading = computed(() => this.listState().loading);
  readonly listError = computed(() => this.listState().error);
  readonly totalCount = computed(() => this.listState().totalCount);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / ASSETS_LIST_PAGE_SIZE)),
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
    const scoped =
      selectedQuarter != null
        ? periods.filter((period) => period.quarter === selectedQuarter)
        : periods;

    return [...new Set(scoped.map((period) => period.calendarYear))].sort((a, b) => b - a);
  });

  readonly subtitleText = computed(() => {
    const count = this.totalCount();
    return `${count} propert${count === 1 ? 'y' : 'ies'}`;
  });

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
    if (this.assetTypeFilter() !== 'all') {
      count += 1;
    }
    if (this.investmentTypeFilter() !== 'all') {
      count += 1;
    }
    if (this.geographyFilter() !== 'all') {
      count += 1;
    }
    if (this.statusFilter() !== 'all') {
      count += 1;
    }
    return count;
  });

  readonly rows = computed(() =>
    this.listState().items.map((item, index) => mapPropertyListItemToRow(item, index)),
  );

  readonly assetTypeOptions = computed(() => this.filterOptions().assetTypes);
  readonly investmentTypeOptions = computed(() => this.filterOptions().investmentTypes);
  readonly geographyOptions = computed(() => this.filterOptions().geographies);
  readonly statusOptions = computed(() => this.filterOptions().statuses);

  readonly pageTotals = computed(() => {
    const rows = this.rows();
    return {
      glaSf: rows.reduce((sum, row) => sum + row.glaSf, 0),
      committedSf: rows.reduce((sum, row) => sum + row.committedSf, 0),
      vacantSf: rows.reduce((sum, row) => sum + row.vacantSf, 0),
    };
  });

  readonly kpiCards = computed(() => {
    const summary = this.listState().summary;
    const total = this.totalCount();

    if (summary) {
      return {
        totalGla: summary.totalGla ?? 0,
        activeProperties: summary.activeProperties ?? 0,
        totalProperties: summary.totalProperties ?? total,
        totalCommittedArea: summary.totalCommittedArea ?? 0,
        totalVacantArea: summary.totalVacantArea ?? 0,
      };
    }

    const rows = this.rows();
    return {
      totalGla: rows.reduce((sum, row) => sum + row.glaSf, 0),
      activeProperties: rows.filter((row) => row.status.toLowerCase() === 'active').length,
      totalProperties: total,
      totalCommittedArea: rows.reduce((sum, row) => sum + row.committedSf, 0),
      totalVacantArea: rows.reduce((sum, row) => sum + row.vacantSf, 0),
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

    return Array.from({ length: VISIBLE_PAGE_BUTTON_COUNT }, (_, index) => start + index);
  });

  readonly showingFrom = computed(() =>
    this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * ASSETS_LIST_PAGE_SIZE + 1,
  );

  readonly showingTo = computed(() =>
    Math.min(this.currentPage() * ASSETS_LIST_PAGE_SIZE, this.totalCount()),
  );

  readonly formatSquareFeet = formatSquareFeet;
  readonly formatAreaNumber = formatAreaNumber;

  constructor() {
    this.routeSearchSync.bindTableSearch(this.tableSearch, () => this.currentPage.set(1));

    this.route.queryParamMap
      .pipe(
        map((params) => {
          const selected = params.get('selected');
          const propertyKey = selected != null ? Number(selected) : NaN;
          return Number.isFinite(propertyKey) && propertyKey > 0 ? propertyKey : null;
        }),
        filter((propertyKey): propertyKey is number => propertyKey != null),
        takeUntilDestroyed(),
      )
      .subscribe((propertyKey) => {
        const search = this.route.snapshot.queryParamMap.get('search');
        void this.router.navigate(['/capital-dashboard/asset', propertyKey], {
          ...(search ? { queryParams: { search } } : {}),
          replaceUrl: true,
        });
      });

    this.assetsApi
      .getFilterOptions()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        const options = normalizeAssetsFilterOptions(response);
        this.filterOptions.set(options);
        this.ensureQuarterlySelection(options);
      });

    effect(() => {
      this.timeframe();
      this.quarter();
      this.year();
      this.assetTypeFilter();
      this.investmentTypeFilter();
      this.geographyFilter();
      this.statusFilter();
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
    this.assetTypeFilter.set('all');
    this.investmentTypeFilter.set('all');
    this.geographyFilter.set('all');
    this.statusFilter.set('all');
    this.currentPage.set(1);
  }

  toggleSort(column: AssetsTableSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDir.set(defaultAssetsSortDirection(column));
    }
    this.currentPage.set(1);
  }

  isSortActive(column: AssetsTableSortColumn): boolean {
    return this.sortColumn() === column;
  }

  sortIcon(column: AssetsTableSortColumn): string {
    if (!this.isSortActive(column)) {
      return 'unfold_more';
    }
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  statusChipClass(status: string): string {
    const normalized = status.trim().toLowerCase();
    const base = 'cdt-status-chip';

    if (normalized === 'active') {
      return `${base} ${base}--active`;
    }
    if (normalized === 'in progress' || normalized === 'pending') {
      return `${base} ${base}--warning`;
    }
    if (normalized === 'inactive' || normalized === 'dissolved' || normalized === 'closed') {
      return `${base} ${base}--inactive`;
    }
    return `${base} ${base}--neutral`;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }
    this.currentPage.set(page);
  }

  openAsset(row: AssetTableRow): void {
    void this.router.navigate(['/capital-dashboard/asset', row.propertyKey], {
      state: {
        assetRow: row,
        reportingPeriod: this.reportingPeriodTitle(),
        listView: this.timeframe(),
        listQuarter: this.quarter(),
        listYear: this.year(),
      },
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

    this.excel.export<AssetTableRow>({
      filename: 'assets',
      sheetName: 'Assets',
      columns: [
        { header: 'Property Name', value: (row) => row.name },
        { header: 'Code', value: (row) => row.code },
        { header: 'Geography', value: (row) => row.geography },
        { header: 'Asset Type', value: (row) => row.assetType },
        { header: 'Investment Type', value: (row) => row.investmentType },
        { header: 'Development Type', value: (row) => row.developmentType },
        { header: 'GLA (sf)', value: (row) => row.glaSf },
        { header: 'Committed (sf)', value: (row) => row.committedSf },
        { header: 'Vacant (sf)', value: (row) => row.vacantSf },
        { header: 'Status', value: (row) => row.status },
      ],
      rows,
    });
  }

  private dispatchLoad(replace: boolean): void {
    const activeSortColumn = this.sortColumn();
    const sortBy = activeSortColumn ? ASSETS_TABLE_SORT_API_FIELDS[activeSortColumn] : undefined;
    const sortDir = activeSortColumn ? this.sortDir() : undefined;
    const activeDateKey = this.timeframe() === 'quarterly' ? this.dateKey() : null;

    const cacheKey = buildAssetsListCacheKey({
      view: this.timeframe(),
      dateKey: activeDateKey,
      assetType: this.assetTypeFilter(),
      investmentType: this.investmentTypeFilter(),
      geography: this.geographyFilter(),
      status: this.statusFilter(),
      sortBy: sortBy ?? null,
      sortDir: sortDir ?? null,
    });

    const apiParams: AssetsQueryParams = {
      view: this.timeframe(),
      page: this.currentPage(),
      pageSize: ASSETS_LIST_PAGE_SIZE,
      search: this.tableSearch().trim() || undefined,
      ...(sortBy && sortDir ? { sortBy, sortDir } : {}),
      ...(activeDateKey != null ? { dateKey: activeDateKey } : {}),
      ...(this.assetTypeFilter() !== 'all' ? { assetType: this.assetTypeFilter() } : {}),
      ...(this.investmentTypeFilter() !== 'all'
        ? { investmentType: this.investmentTypeFilter() }
        : {}),
      ...(this.geographyFilter() !== 'all' ? { geography: this.geographyFilter() } : {}),
      ...(this.statusFilter() !== 'all' ? { status: this.statusFilter() } : {}),
    };

    this.store.dispatch(
      AssetsApiActions.loadList({
        search: this.tableSearch().trim(),
        page: this.currentPage(),
        replace,
        cacheKey,
        apiParams,
      }),
    );
  }

  private ensureQuarterlySelection(options: AssetsFilterOptions): void {
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
    const year = this.year();
    if (currentQuarter == null || year == null) {
      this.quarter.set(quarters[0] ?? null);
      return;
    }

    const match = this.quarterlyPeriodOptions().some(
      (period) => period.quarter === currentQuarter && period.calendarYear === year,
    );
    if (!match) {
      const forYear = this.quarterlyPeriodOptions().find((period) => period.calendarYear === year);
      this.quarter.set(forYear?.quarter ?? quarters[0] ?? null);
    }
  }
}
