import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, Subject } from 'rxjs';

import { KsCurrencyPipe } from '../../../../shared/pipes/ks-currency.pipe';
import { CapitalInvestorsApiService } from '../../shared/services/capital-investors-api.service';
import { InvestorTransactionTableFiltersDto } from '../../shared/models/api.models';
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import { fundTableRowFromFundExposure } from '../../shared/utils/fund-list-row.util';
import { InvestorDetailTableRow } from './models/investor-detail-table.models';
import {
  EMPTY_INVESTORS_FILTER_OPTIONS,
  InvestorsFilterOptions,
  normalizeInvestorsFilterOptions,
} from '../../shared/utils/investor-filter-options.util';
import { buildQuarterlyTransactionPeriodParams } from '../../shared/utils/quarterly-transaction-period.util';
import {
  isServerSortedTransactionTable,
  resolveTransactionTableSort,
  TransactionTableSortDir,
} from '../../shared/utils/transaction-table-period.util';
import { InvestorsApiActions } from '../../store';
import { selectInvestorsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { INVESTOR_DETAIL_SIDEBAR_SECTIONS } from './models/investor-detail-sidebar.config';
import { InvestorDetailSidebarComponent } from './investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from './investor-detail-block/investor-detail-block.component';
import { InvestorDetailBlock } from './models/investor-detail-block.models';
import {
  buildFlatInvestorBlocks,
  buildFundHoldingsTable,
  formatInvestorAddress,
  InvestorDetailFlatBlock,
  InvestorDetailSectionId,
  InvestorOverviewInput,
  kpiCardsFromListRow,
  pickDisplayLabel,
} from './utils/investor-detail-tables.util';
import {
  investorDetailHasProfileData,
  kpiCardsFromInvestorDetail,
  readInvestorDetailString,
} from './utils/investor-detail-api.util';
import {
  buildInvestorTransactionHubBlock,
  hubCategoryFundCode,
  hubCategorySearchKey,
  hubSortBlockId,
  normalizeInvestorTransactionTableFilters,
} from './utils/investor-transaction-hub.util';
import {
  InvestorTransactionCategoryId,
  InvestorTransactionFilterOption,
} from './models/investor-transaction-hub.models';

type DetailTimeframe = 'ltd' | 'quarterly' | 'daily';

interface TransactionTableSort {
  sortBy: string;
  sortDir: TransactionTableSortDir;
}

@Component({
  selector: 'app-investor-detail',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    RouterModule,
    MatIconModule,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  providers: [KsCurrencyPipe],
  templateUrl: './investor-detail.component.html',
  styleUrl: './investor-detail.component.scss',
})
export class InvestorDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly investorsApi = inject(CapitalInvestorsApiService);
  private readonly ksCurrency = inject(KsCurrencyPipe);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly stickyChromeRef = viewChild<ElementRef<HTMLElement>>('stickyChrome');

  private static readonly SECTION_SCROLL_GAP_PX = 8;

  readonly sidebarSections = INVESTOR_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestorDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<DetailTimeframe>('ltd');
  readonly quarterScope = signal<number | 'all'>('all');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<InvestorsFilterOptions>(EMPTY_INVESTORS_FILTER_OPTIONS);

  readonly investorKey = signal<number | null>(null);
  readonly listRow = signal<InvestorTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectInvestorsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly error = computed(() => this.detailState().error);
  readonly detail = computed(() => this.detailState().detail);

  readonly contentLoading = computed(
    () => this.loading() && !this.detail() && !this.listRow(),
  );
  readonly contentLoadingMessage = computed(() => 'Loading investor profile…');

  readonly quarterlyPeriodOptions = computed(() => this.filterOptions().quarterlyPeriods);

  readonly dateKey = computed(() => {
    if (this.timeframe() !== 'quarterly' || this.quarterScope() === 'all') {
      return null;
    }

    const quarter = this.quarterScope();
    const year = this.year();
    if (typeof quarter !== 'number' || year == null) {
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
    return [...new Set(periods.map((period) => period.calendarYear))].sort((a, b) => b - a);
  });

  readonly investorName = computed(
    () =>
      pickDisplayLabel(
        readInvestorDetailString(this.detail(), 'investor_name', 'investorName', 'InvestorName'),
        this.listRow()?.name,
        this.detail()?.summary?.investorName,
      ) || 'Investor',
  );

  readonly investorType = computed(
    () =>
      pickDisplayLabel(
        readInvestorDetailString(
          this.detail(),
          'investor_type',
          'investor_type_name',
          'investorType',
          'InvestorType',
        ),
        this.listRow()?.investorType,
        this.detail()?.summary?.investorType,
      ) || '—',
  );

  readonly relationshipLabel = computed(
    () =>
      pickDisplayLabel(
        readInvestorDetailString(
          this.detail(),
          'relationship',
          'relationship_name',
          'relationshipName',
          'RelationshipName',
        ),
        this.listRow()?.relationship,
      ) || '—',
  );
  readonly contactName = computed(
    () =>
      pickDisplayLabel(
        readInvestorDetailString(this.detail(), 'contact', 'Contact'),
        this.listRow()?.contactName,
      ) || '—',
  );

  readonly hasMetricData = computed(
    () => investorDetailHasProfileData(this.detail()) || this.listRow() != null,
  );

  readonly fundHoldingsTable = computed(() => {
    const state = this.detailState();
    return buildFundHoldingsTable(state.fundHoldings, state.fundHoldingsDateKey);
  });

  readonly periodLabel = computed(() => {
    if (this.timeframe() === 'quarterly') {
      const year = this.year();
      if (this.quarterScope() === 'all') {
        return year != null ? `All · ${year}` : 'Quarterly';
      }

      const quarter = this.quarterScope();
      if (typeof quarter !== 'number' || year == null) {
        return year != null ? `All · ${year}` : 'Quarterly';
      }

      const period = this.quarterlyPeriodOptions().find(
        (item) => item.quarter === quarter && item.calendarYear === year,
      );
      return period?.label ?? period?.quarterYear ?? `Q${quarter} ${year}`;
    }

    switch (this.timeframe()) {
      case 'daily':
        return 'Daily';
      default:
        return 'ITD';
    }
  });

  readonly transactionHubPeriodSummary = computed(() => {
    if (this.timeframe() === 'ltd') {
      return 'ITD';
    }
    if (this.timeframe() === 'daily') {
      return 'Daily';
    }
    return this.periodLabel();
  });


  readonly kpiCards = computed(() => {
    const detail = this.detail();
    if (investorDetailHasProfileData(detail)) {
      return kpiCardsFromInvestorDetail(detail);
    }
    return kpiCardsFromListRow(this.listRow());
  });

  readonly tableContextKey = computed(() => {
    const investorKey = this.investorKey();
    const timeframe = this.timeframe();
    const dateKey = timeframe === 'quarterly' ? this.dateKey() : null;
    return `${investorKey ?? ''}:${timeframe}:${dateKey ?? ''}`;
  });

  private readonly hubResetKey = computed(
    () => `${this.investorKey() ?? ''}:${this.timeframe()}`,
  );

  private static readonly TRANSACTION_HUB_CATEGORIES: InvestorTransactionCategoryId[] = [
    'capital-activities',
    'distributions',
    'irrs',
    'capital-obligations',
    'net-assets',
  ];

  private lastTransactionHubPeriodLoadKey = '';

  private lastTransactionHubFilterPeriodLoadKey = '';

  private lastHubResetKey = '';
  /** List period to restore after hub reset (reset otherwise forces quarterScope=all). */
  private pendingListPeriod: { quarter: number | null; year: number | null } | null = null;

  private readonly transactionHubFilterOptions = signal<
    Record<InvestorTransactionCategoryId, InvestorTransactionFilterOption[]>
  >({
    'capital-activities': [],
    distributions: [],
    irrs: [],
    'capital-obligations': [],
    'net-assets': [],
  });

  private readonly transactionHubFilterLoadSeq: Record<InvestorTransactionCategoryId, number> = {
    'capital-activities': 0,
    distributions: 0,
    irrs: 0,
    'capital-obligations': 0,
    'net-assets': 0,
  };

  private readonly transactionSearch$ = new Subject<{ blockId: string; search: string }>();
  private readonly transactionSort = signal<Record<string, TransactionTableSort>>({});
  readonly transactionHubCategory = signal<InvestorTransactionCategoryId>('capital-activities');
  readonly transactionHubAppliedFundCode = computed(() => {
    const code = hubCategoryFundCode(this.transactionHubCategory(), this.detailState());
    return code || 'all';
  });

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    const overview: InvestorOverviewInput = {
      investorName: this.investorName(),
      investorType: this.investorType(),
      relationship: this.relationshipLabel(),
      contactName: this.contactName(),
      status:
        readInvestorDetailString(this.detail(), 'status', 'Status') ||
        this.detail()?.summary?.status ||
        'Active',
      address: formatInvestorAddress(this.detail(), this.listRow()?.address ?? ''),
    };
    const base = buildFlatInvestorBlocks(
      state.detail,
      state.fundHoldings,
      state.fundHoldingsDateKey,
      state.capitalInvestments,
      {
        page: state.capitalInvestmentsPage,
        pageSize: state.capitalInvestmentsPageSize,
        totalPages: state.capitalInvestmentsTotalPages,
        totalCount: state.capitalInvestmentsTotalCount,
        hasPreviousPage: state.capitalInvestmentsHasPreviousPage,
        hasNextPage: state.capitalInvestmentsHasNextPage,
      },
      state.capitalActivities,
      state.distributionTable,
      state.irr,
      this.kpiCards(),
      this.periodLabel(),
      overview,
    );

    return base.map((item) => {
      if (item.block.kind !== 'transaction-hub') {
        return item;
      }
      const categoryId = this.transactionHubCategory();
      const fundCodeOptions = this.transactionHubFilterOptions()[categoryId];
      return {
        ...item,
        block: buildInvestorTransactionHubBlock(
          state,
          categoryId,
          this.transactionHubPeriodSummary(),
          fundCodeOptions,
        ),
      };
    });
  });

  constructor() {
    this.transactionSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.blockId === b.blockId && a.search === b.search),
        takeUntilDestroyed(),
      )
      .subscribe(({ blockId, search }) => {
        if (blockId === 'investor-transactions') {
          this.loadTransactionHubCategory(this.transactionHubCategory(), search);
          return;
        }
        this.loadTransactionTable(blockId, search);
      });

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

    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('investorKey'))),
        takeUntilDestroyed(),
      )
      .subscribe((investorKey) => {
        if (!Number.isFinite(investorKey) || investorKey <= 0) {
          void this.router.navigate(['/capital-dashboard/investor']);
          return;
        }

        this.investorKey.set(investorKey);
        this.loadInvestorData(investorKey);
      });

    const navigationState = (history.state ?? {}) as {
      investorRow?: InvestorTableRow;
      reportingPeriod?: string;
      listView?: 'ltd' | 'quarterly' | 'daily';
      listQuarter?: number | null;
      listYear?: number | null;
    };
    if (navigationState.investorRow) {
      this.listRow.set(navigationState.investorRow);
    }
    this.applyListReportingPeriod(navigationState);

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(InvestorsApiActions.clearDetail());
    });

    effect(() => {
      const resetKey = this.hubResetKey();
      const view = this.timeframe();
      const investorKey = this.investorKey();

      untracked(() => {
        if (resetKey !== this.lastHubResetKey) {
          this.lastHubResetKey = resetKey;
          this.transactionSort.set({});
          if (investorKey != null) {
            this.applyPendingListPeriodOrDefaultAll();
          } else if (!this.pendingListPeriod) {
            this.quarterScope.set('all');
          }
          this.lastTransactionHubPeriodLoadKey = '';
          this.lastTransactionHubFilterPeriodLoadKey = '';
          this.transactionHubFilterOptions.set({
            'capital-activities': [],
            distributions: [],
            irrs: [],
            'capital-obligations': [],
            'net-assets': [],
          });
        }
      });

      if (investorKey == null) {
        return;
      }

      const scope = view === 'quarterly' ? this.quarterScope() : ('all' as const);
      const year = view === 'quarterly' ? this.year() : null;
      const dateKey = view === 'quarterly' ? this.dateKey() : null;

      if (view === 'quarterly' && year == null) {
        return;
      }
      if (view === 'quarterly' && scope !== 'all' && dateKey == null) {
        return;
      }

      const loadKey = [
        investorKey,
        view,
        view === 'quarterly' ? scope : '',
        view === 'quarterly' ? (year ?? '') : '',
        view === 'quarterly' ? (dateKey ?? '') : '',
      ].join('|');
      if (loadKey === this.lastTransactionHubPeriodLoadKey) {
        return;
      }
      this.lastTransactionHubPeriodLoadKey = loadKey;
      untracked(() => this.loadAllTransactionHubTables());
    });

    effect((onCleanup) => {
      if (this.contentLoading()) {
        return;
      }

      this.flatBlocks();

      const main = this.mainContentRef()?.nativeElement;
      const sticky = this.stickyChromeRef()?.nativeElement;
      if (!main) {
        return;
      }

      const syncStickyOffset = (): void => {
        const offset = sticky?.offsetHeight ?? 0;
        main.style.setProperty('--inv-detail-sticky-offset', `${offset}px`);
        main.dispatchEvent(new Event('scroll'));
      };

      syncStickyOffset();

      let resizeObserver: ResizeObserver | undefined;
      if (sticky && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => syncStickyOffset());
        resizeObserver.observe(sticky);
      }

      let detachSpy: (() => void) | undefined;
      const frame = requestAnimationFrame(() => {
        detachSpy = bindDetailSectionScrollSpy({
          main,
          sectionIds: flattenSidebarSectionIds(this.sidebarSections),
          activeSectionId: this.activeSectionId,
          isPaused: () => this.scrollSpyPaused(),
          sectionActivationOffset: () =>
            this.getStickyScrollOffset() + InvestorDetailComponent.SECTION_SCROLL_GAP_PX,
        });
      });

      onCleanup(() => {
        cancelAnimationFrame(frame);
        detachSpy?.();
        resizeObserver?.disconnect();
      });
    });

  }

  setTimeframe(view: DetailTimeframe): void {
    if (view === 'daily') {
      view = 'ltd';
    }
    this.timeframe.set(view);
    if (view === 'quarterly') {
      this.quarterScope.set('all');
      this.ensureQuarterlySelection(this.filterOptions());
    }
  }

  setTransactionTimeframe(view: DetailTimeframe): void {
    this.setTimeframe(view);
  }

  setQuarterScope(scope: number | 'all'): void {
    this.quarterScope.set(scope);
    if (scope !== 'all') {
      this.quarter.set(scope);
      this.alignYearForQuarterScope(scope);
    }
  }

  setQuarter(quarter: number): void {
    this.quarterScope.set(quarter);
    this.quarter.set(quarter);
    this.alignYearToQuarter();
  }

  setYear(year: number): void {
    this.year.set(year);
    if (this.timeframe() === 'quarterly' && this.quarterScope() !== 'all') {
      this.alignQuarterToYear();
    }
  }

  onTransactionSearch(event: { blockId: string; search: string }): void {
    this.transactionSearch$.next(event);
  }

  onTransactionHubCategoryChange(categoryId: InvestorTransactionCategoryId): void {
    this.transactionHubCategory.set(categoryId);
  }

  onTransactionHubPageChange(page: number): void {
    this.loadTransactionHubCategory(
      this.transactionHubCategory(),
      hubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
      page,
    );
  }

  onTransactionHubFundFilterApply(value: string): void {
    const fundCode = value === 'all' ? '' : value;
    this.loadTransactionHubCategory(
      this.transactionHubCategory(),
      hubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
      1,
      fundCode,
    );
  }

  onTransactionSort(event: { blockId: string; sortBy: string; defaultDir: TransactionTableSortDir }): void {
    const blockId =
      event.blockId === 'investor-transactions'
        ? hubSortBlockId(this.transactionHubCategory())
        : event.blockId;
    const current = this.transactionSort()[blockId];
    const nextDir: TransactionTableSortDir =
      current?.sortBy === event.sortBy
        ? current.sortDir === 'asc'
          ? 'desc'
          : 'asc'
        : event.defaultDir;

    this.transactionSort.update((state) => ({
      ...state,
      [blockId]: { sortBy: event.sortBy, sortDir: nextDir },
    }));

    if (this.isServerSortedTable(blockId)) {
      if (event.blockId === 'investor-transactions') {
        this.loadTransactionHubCategory(
          this.transactionHubCategory(),
          hubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
        );
      } else {
        this.reloadTransactionTable(blockId);
      }
    }
  }

  private isServerSortedTable(blockId: string): boolean {
    return isServerSortedTransactionTable(blockId);
  }

  tableSortColumnForBlock(block: InvestorDetailBlock): string | null {
    if (block.kind === 'transaction-hub') {
      return resolveTransactionTableSort(
        hubSortBlockId(this.transactionHubCategory()),
        this.transactionSort(),
      )?.sortBy ?? null;
    }
    if (block.kind !== 'table' || !this.hasSortableColumns(block)) {
      return null;
    }
    return resolveTransactionTableSort(block.id, this.transactionSort())?.sortBy ?? null;
  }

  tableSortDirForBlock(block: InvestorDetailBlock): TransactionTableSortDir {
    if (block.kind === 'transaction-hub') {
      return (
        resolveTransactionTableSort(hubSortBlockId(this.transactionHubCategory()), this.transactionSort())
          ?.sortDir ?? 'desc'
      );
    }
    if (block.kind !== 'table' || !this.hasSortableColumns(block)) {
      return 'desc';
    }
    return resolveTransactionTableSort(block.id, this.transactionSort())?.sortDir ?? 'desc';
  }

  private hasSortableColumns(block: InvestorDetailBlock): boolean {
    return block.kind === 'table' && block.columns.some((column) => !!column.sortBy);
  }

  tableLoadingForBlock(block: InvestorDetailBlock): boolean {
    if (block.kind === 'transaction-hub') {
      return block.loading;
    }
    if (block.kind === 'table' && block.id === 'fund-exposure') {
      return this.detailState().fundHoldingsLoading;
    }
    if (block.kind === 'table' && block.id === 'underlying-investments') {
      return this.detailState().capitalInvestmentsLoading;
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return false;
    }

    const state = this.detailState();
    switch (block.id) {
      case 'capital-activities':
        return state.capitalActivitiesLoading;
      case 'distributions':
        return state.distributionTableLoading;
      case 'irrs':
        return state.irrLoading;
      case 'capital-obligations':
        return state.capitalObligationsLoading;
      case 'net-assets':
        return state.netAssetsLoading;
      default:
        return false;
    }
  }

  tableSearchActiveForBlock(block: InvestorDetailBlock): boolean {
    if (block.kind === 'transaction-hub') {
      return !!hubCategorySearchKey(this.transactionHubCategory(), this.detailState()).trim();
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return false;
    }

    const state = this.detailState();
    switch (block.id) {
      case 'capital-activities':
        return !!state.capitalActivitiesSearch.trim();
      case 'distributions':
        return !!state.distributionTableSearch.trim();
      case 'irrs':
        return !!state.irrSearch.trim();
      case 'capital-obligations':
        return !!state.capitalObligationsSearch.trim();
      case 'net-assets':
        return !!state.netAssetsSearch.trim();
      default:
        return false;
    }
  }

  scrollToSection(sectionId: string): void {
    this.scrollSpyPaused.set(true);
    this.activeSectionId.set(sectionId as InvestorDetailSectionId);

    requestAnimationFrame(() => {
      const main = this.mainContentRef()?.nativeElement;
      if (!main) {
        this.scrollSpyPaused.set(false);
        return;
      }

      const target = main.querySelector<HTMLElement>(`#inv-section-${sectionId}`);
      if (target) {
        const mainRect = main.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const stickyOffset =
          this.getStickyScrollOffset() + InvestorDetailComponent.SECTION_SCROLL_GAP_PX;
        const top = main.scrollTop + (targetRect.top - mainRect.top) - stickyOffset;
        main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }

      window.setTimeout(() => this.scrollSpyPaused.set(false), 800);
    });
  }

  private getStickyScrollOffset(): number {
    return this.stickyChromeRef()?.nativeElement.offsetHeight ?? 0;
  }

  openFundFromExposure(event: { row: InvestorDetailTableRow; rowIndex: number }): void {
    const row = event.row;
    const fundKey = row['fundKey'];
    if (typeof fundKey !== 'number' || !Number.isFinite(fundKey) || fundKey <= 0) {
      return;
    }

    const fundName = typeof row['fund'] === 'string' ? row['fund'] : '—';
    const readAmount = (key: string): number => {
      const value = row[key];
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    };

    const investorKey = this.investorKey();
    void this.router.navigate(['/capital-dashboard/investment', fundKey], {
      state: {
        fundRow: fundTableRowFromFundExposure({
          fundKey,
          fundName,
          commitment: readAmount('commitment'),
          netInvestedCapital: readAmount('netInvestedCapital') || readAmount('netInvested'),
          netDistributed: readAmount('netDistributed') || readAmount('distributed'),
          unfunded: readAmount('unfunded') || readAmount('unfundedAmount'),
          releasedCapital: readAmount('releasedCapital'),
          fundType: null,
          strategy: null,
          index: event.rowIndex,
        }),
        reportingPeriod: this.periodLabel(),
        listView: this.timeframe(),
        listQuarter: this.quarter(),
        listYear: this.year(),
        ...(investorKey != null && investorKey > 0
          ? {
              returnToInvestor: {
                investorKey,
                investorName: this.investorName(),
                investorRow: this.listRow(),
              },
            }
          : {}),
      },
    });
  }

  openFundFromOverview(event: { fundKey: number }): void {
    const holdings = this.fundHoldingsTable();
    const rowIndex = holdings.rows.findIndex((row) => row['fundKey'] === event.fundKey);
    if (rowIndex < 0) {
      return;
    }

    this.openFundFromExposure({ row: holdings.rows[rowIndex], rowIndex });
  }

  private loadInvestorData(investorKey: number): void {
    this.store.dispatch(InvestorsApiActions.loadDetail({ investorKey }));
    this.loadFundHoldings();
    this.loadUnderlyingInvestmentsPage(1);
  }

  private loadFundHoldings(): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    this.store.dispatch(
      InvestorsApiActions.loadInvestorFundHoldings({
        investorKey,
      }),
    );
  }

  backToList(): void {
    void this.router.navigate(['/capital-dashboard/investor']);
  }

  formatKpiAmount(value: number): string {
    if (!this.hasMetricData()) {
      return '--';
    }
    return this.ksCurrency.transform(value, 'USD', 2, true);
  }

  formatKpiCount(value: number): string {
    if (!this.hasMetricData() || value <= 0) {
      return '--';
    }
    return String(value);
  }

  onUnderlyingInvestmentsPageChange(page: number): void {
    this.loadUnderlyingInvestmentsPage(page);
  }

  private loadUnderlyingInvestmentsPage(page: number): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    this.store.dispatch(
      InvestorsApiActions.loadInvestorCapitalInvestmentsPage({
        investorKey,
        page,
        replace: true,
      }),
    );
  }

  private visibleTransactionHubCategories(): InvestorTransactionCategoryId[] {
    return InvestorDetailComponent.TRANSACTION_HUB_CATEGORIES;
  }

  private loadAllTransactionHubTables(): void {
    const state = untracked(() => this.detailState());
    for (const categoryId of this.visibleTransactionHubCategories()) {
      this.loadTransactionHubCategory(
        categoryId,
        hubCategorySearchKey(categoryId, state),
        1,
      );
    }
    this.loadAllTransactionHubFilters();
  }

  private loadAllTransactionHubFilters(): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    const view = this.timeframe();
    const scope = this.quarterScope();
    const year = this.year();
    const dateKey = this.dateKey();

    if (view === 'quarterly' && year == null) {
      return;
    }
    if (view === 'quarterly' && scope !== 'all' && dateKey == null) {
      return;
    }

    const filterLoadKey = [
      investorKey,
      view,
      view === 'quarterly' ? scope : '',
      view === 'quarterly' ? (year ?? '') : '',
      view === 'quarterly' ? (dateKey ?? '') : '',
    ].join('|');

    if (filterLoadKey === this.lastTransactionHubFilterPeriodLoadKey) {
      return;
    }
    this.lastTransactionHubFilterPeriodLoadKey = filterLoadKey;

    for (const categoryId of this.visibleTransactionHubCategories()) {
      this.loadTransactionHubFilters(categoryId);
    }
  }

  private loadTransactionHubFilters(categoryId: InvestorTransactionCategoryId): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.year() == null) {
      return;
    }
    if (timeframe === 'quarterly' && this.quarterScope() !== 'all' && this.dateKey() == null) {
      return;
    }

    const loadSeq = ++this.transactionHubFilterLoadSeq[categoryId];
    const periodParams = this.quarterlyTransactionPeriodParams();

    this.getTransactionHubFilters$(categoryId, investorKey, timeframe, periodParams)
      .pipe(
        catchError(() => of({ items: [] } as InvestorTransactionTableFiltersDto)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (loadSeq !== this.transactionHubFilterLoadSeq[categoryId]) {
          return;
        }

        const options = normalizeInvestorTransactionTableFilters(response);
        this.transactionHubFilterOptions.update((state) => ({
          ...state,
          [categoryId]: options,
        }));
      });
  }

  private getTransactionHubFilters$(
    categoryId: InvestorTransactionCategoryId,
    investorKey: number,
    timeframe: DetailTimeframe,
    periodParams: { dateKey?: number; calendarYear?: number } = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    switch (categoryId) {
      case 'capital-activities':
        return this.investorsApi.getInvestorCapitalActivitiesFilters(investorKey, timeframe, periodParams);
      case 'distributions':
        return this.investorsApi.getInvestorDistributionTableFilters(investorKey, timeframe, periodParams);
      case 'irrs':
        return this.investorsApi.getInvestorIrrFilters(investorKey, timeframe, periodParams);
      case 'capital-obligations':
        return this.investorsApi.getInvestorCapitalObligationsFilters(investorKey, timeframe, periodParams);
      case 'net-assets':
        return this.investorsApi.getInvestorNetAssetsFilters(investorKey, timeframe, periodParams);
      default:
        return of({ items: [] });
    }
  }

  private loadTransactionHubCategory(
    categoryId: InvestorTransactionCategoryId,
    search: string,
    page = 1,
    fundCodeInput?: string,
  ): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.year() == null) {
      return;
    }
    if (timeframe === 'quarterly' && this.quarterScope() !== 'all' && this.dateKey() == null) {
      return;
    }

    const sortBlockId = hubSortBlockId(categoryId);
    const sort = resolveTransactionTableSort(sortBlockId, untracked(() => this.transactionSort()));
    const fundCode = fundCodeInput ?? hubCategoryFundCode(categoryId, this.detailState());
    const periodParams = this.quarterlyTransactionPeriodParams();
    const request = {
      investorKey,
      timeframe,
      page,
      search,
      replace: true,
      ...periodParams,
      ...(fundCode ? { fundCode } : {}),
      ...(sort ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
    };

    switch (categoryId) {
      case 'capital-activities':
        this.store.dispatch(InvestorsApiActions.loadInvestorCapitalActivitiesPage(request));
        break;
      case 'distributions':
        this.store.dispatch(InvestorsApiActions.loadInvestorDistributionTablePage(request));
        break;
      case 'irrs':
        this.store.dispatch(InvestorsApiActions.loadInvestorIrrPage(request));
        break;
      case 'capital-obligations':
        this.store.dispatch(InvestorsApiActions.loadInvestorCapitalObligationsPage(request));
        break;
      case 'net-assets':
        this.store.dispatch(InvestorsApiActions.loadInvestorNetAssetsPage(request));
        break;
    }
  }

  private reloadTransactionTable(blockId: string): void {
    const state = this.detailState();
    let search = '';
    switch (blockId) {
      case 'capital-activities':
        search = state.capitalActivitiesSearch;
        break;
      case 'distributions':
        search = state.distributionTableSearch;
        break;
      case 'irrs':
        search = state.irrSearch;
        break;
      case 'capital-obligations':
        search = state.capitalObligationsSearch;
        break;
      case 'net-assets':
        search = state.netAssetsSearch;
        break;
    }
    this.loadTransactionTable(blockId, search);
  }

  private loadTransactionTable(blockId: string, search: string): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.dateKey() == null) {
      return;
    }

    const request = this.buildTransactionTableRequest(investorKey, timeframe, blockId, search);

    switch (blockId) {
      case 'capital-activities':
        this.store.dispatch(InvestorsApiActions.loadInvestorCapitalActivitiesPage(request));
        break;
      case 'distributions':
        this.store.dispatch(InvestorsApiActions.loadInvestorDistributionTablePage(request));
        break;
      case 'irrs':
        this.store.dispatch(InvestorsApiActions.loadInvestorIrrPage(request));
        break;
      case 'capital-obligations':
        this.store.dispatch(InvestorsApiActions.loadInvestorCapitalObligationsPage(request));
        break;
      case 'net-assets':
        this.store.dispatch(InvestorsApiActions.loadInvestorNetAssetsPage(request));
        break;
    }
  }

  private buildTransactionTableRequest(
    investorKey: number,
    timeframe: DetailTimeframe,
    blockId: string,
    search = '',
  ) {
    const sort = resolveTransactionTableSort(blockId, untracked(() => this.transactionSort()));
    const periodParams = this.quarterlyTransactionPeriodParams();
    return {
      investorKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...periodParams,
      ...(sort ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
    };
  }

  private quarterlyTransactionPeriodParams() {
    return buildQuarterlyTransactionPeriodParams(
      this.timeframe(),
      this.quarterScope(),
      this.year(),
      this.dateKey(),
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

  private applyListReportingPeriod(state: {
    listView?: 'ltd' | 'quarterly' | 'daily';
    listQuarter?: number | null;
    listYear?: number | null;
  }): void {
    const view = state.listView;
    if (view !== 'ltd' && view !== 'quarterly' && view !== 'daily') {
      return;
    }

    const normalizedView = view === 'daily' ? 'ltd' : view;

    if (normalizedView === 'quarterly') {
      this.pendingListPeriod = {
        quarter: state.listQuarter ?? null,
        year: state.listYear ?? null,
      };
    } else {
      this.pendingListPeriod = null;
    }

    this.timeframe.set(normalizedView);
  }

  private applyPendingListPeriodOrDefaultAll(): void {
    const pending = this.pendingListPeriod;
    this.pendingListPeriod = null;

    if (!pending) {
      this.quarterScope.set('all');
      return;
    }

    if (pending.quarter != null) {
      this.quarterScope.set(pending.quarter);
      this.quarter.set(pending.quarter);
    } else {
      this.quarterScope.set('all');
    }
    if (pending.year != null) {
      this.year.set(pending.year);
    }
  }

  private alignYearForQuarterScope(quarter: number): void {
    const periods = this.quarterlyPeriodOptions();
    const year = this.year();
    if (
      year != null &&
      periods.some((period) => period.quarter === quarter && period.calendarYear === year)
    ) {
      return;
    }

    const match = periods.find((period) => period.quarter === quarter);
    if (match) {
      this.year.set(match.calendarYear);
    }
  }

  private alignYearToQuarter(): void {
    const years = this.availableYears();
    const currentYear = this.year();
    if (currentYear == null || !years.includes(currentYear)) {
      this.year.set(years[0] ?? null);
    }
  }

  private alignQuarterToYear(): void {
    const year = this.year();
    const periods = this.quarterlyPeriodOptions();
    const quartersForYear =
      year != null
        ? [...new Set(periods.filter((period) => period.calendarYear === year).map((period) => period.quarter))].sort(
            (a, b) => a - b,
          )
        : this.availableQuarters();
    const currentQuarter = this.quarter();
    if (currentQuarter == null || !quartersForYear.includes(currentQuarter)) {
      const next = quartersForYear[0] ?? null;
      this.quarter.set(next);
      if (next != null && this.quarterScope() !== 'all') {
        this.quarterScope.set(next);
      }
    }
  }
}
