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
import {
  InvestorDetailDto,
  InvestorFundHoldingTabRow,
  InvestorTransactionTableFiltersDto,
} from '../../shared/models/api.models';
import { mapInvestorFundHoldingsResponse } from '../../shared/mappers/investor-fund-holdings.mapper';
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
  hasQuarterData,
  latestQuarterWithData,
  periodsWithData,
  quarterKeysFromPeriods,
  quarterPeriodLabel,
  quartersWithData,
  yearsWithData,
} from '../../shared/utils/quarter-availability.util';
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
  TRANSACTION_HUB_PREFETCH_DELAY_MS,
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

  /** Quarters this investor has data in; undefined while loading, null if the lookup failed. */
  private readonly quarterDataKeys = signal<Set<string> | null | undefined>(undefined);

  private readonly dataPeriods = computed(() =>
    periodsWithData(this.quarterlyPeriodOptions(), this.quarterDataKeys()),
  );

  /** Quarters with data in the selected year; the rest show disabled. */
  readonly availableQuarters = computed(() => quartersWithData(this.dataPeriods(), this.year()));

  readonly availableYears = computed(() => yearsWithData(this.dataPeriods()));

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

  private readonly effectiveFundHoldings = computed(() => {
    const period = this.periodFundHoldings();
    if (period) {
      return period;
    }
    if (this.selectedQuarterDateKey() != null) {
      return { dateKey: null, items: [] as InvestorFundHoldingTabRow[] };
    }
    const state = this.detailState();
    return { dateKey: state.fundHoldingsDateKey, items: state.fundHoldings };
  });

  readonly fundHoldingsTable = computed(() => {
    const holdings = this.effectiveFundHoldings();
    return buildFundHoldingsTable(holdings.items, holdings.dateKey);
  });

  readonly periodLabel = computed(() => {
    if (this.timeframe() === 'quarterly') {
      return quarterPeriodLabel(this.quarterScope(), this.year());
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


  private readonly periodDetail = signal<InvestorDetailDto | null>(null);
  private readonly periodFundHoldings = signal<{
    dateKey: number | null;
    items: InvestorFundHoldingTabRow[];
  } | null>(null);
  private lastPeriodLoadKey = '';

  private readonly selectedQuarterDateKey = computed(() =>
    this.timeframe() === 'quarterly' ? this.dateKey() : null,
  );

  readonly kpiCards = computed(() => {
    const periodDetail = this.periodDetail();
    if (periodDetail && investorDetailHasProfileData(periodDetail)) {
      return kpiCardsFromInvestorDetail(periodDetail);
    }
    if (this.selectedQuarterDateKey() == null) {
      const detail = this.detail();
      if (investorDetailHasProfileData(detail)) {
        return kpiCardsFromInvestorDetail(detail);
      }
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
  private readonly transactionHubFiltersLoaded = new Set<InvestorTransactionCategoryId>();
  private readonly transactionHubTablesLoaded = new Set<InvestorTransactionCategoryId>();
  private transactionHubPrefetchTimer: ReturnType<typeof setTimeout> | null = null;

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
    const holdings = this.effectiveFundHoldings();
    const base = buildFlatInvestorBlocks(
      state.detail,
      holdings.items,
      holdings.dateKey,
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
        this.filterOptions.set(normalizeInvestorsFilterOptions(response));
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
      this.cancelTransactionHubPrefetch();
      this.store.dispatch(InvestorsApiActions.clearDetail());
    });

    effect((onCleanup) => {
      const investorKey = this.investorKey();
      untracked(() => this.quarterDataKeys.set(undefined));
      if (investorKey == null) {
        return;
      }
      const sub = this.investorsApi
        .getInvestorPeriodsPage(investorKey, { view: 'quarterly', source: 'commitments', pageSize: 200 })
        .pipe(catchError(() => of(null)))
        .subscribe((result) => this.quarterDataKeys.set(result ? quarterKeysFromPeriods(result.items) : null));
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      this.dataPeriods();
      if (this.timeframe() === 'quarterly') {
        untracked(() => this.ensureQuarterlySelection());
      }
    });

    effect((onCleanup) => {
      const investorKey = this.investorKey();
      const dateKey = this.selectedQuarterDateKey();
      const loadKey = `${investorKey ?? ''}|${dateKey ?? ''}`;
      if (loadKey === this.lastPeriodLoadKey) {
        return;
      }
      this.lastPeriodLoadKey = loadKey;

      untracked(() => {
        this.periodDetail.set(null);
        this.periodFundHoldings.set(null);
      });
      if (investorKey == null || dateKey == null) {
        return;
      }

      const detailSub = this.investorsApi
        .getInvestor(investorKey, dateKey)
        .pipe(catchError(() => of(null)))
        .subscribe((detail) => this.periodDetail.set(detail));
      const holdingsSub = this.investorsApi
        .getInvestorFundHoldings(investorKey, dateKey)
        .pipe(catchError(() => of(null)))
        .subscribe((result) => this.periodFundHoldings.set(mapInvestorFundHoldingsResponse(result)));
      onCleanup(() => {
        detailSub.unsubscribe();
        holdingsSub.unsubscribe();
      });
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
            this.applyPendingListPeriod();
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
        // Scroll-area height: the transactions grid fills what's left below the sticky header.
        main.style.setProperty('--inv-detail-main-height', `${main.clientHeight}px`);
        main.dispatchEvent(new Event('scroll'));
      };

      syncStickyOffset();

      let resizeObserver: ResizeObserver | undefined;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => syncStickyOffset());
        resizeObserver.observe(main);
        if (sticky) {
          resizeObserver.observe(sticky);
        }
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
    const switchingToQuarterly = view === 'quarterly' && this.timeframe() !== 'quarterly';
    this.timeframe.set(view);
    if (switchingToQuarterly) {
      this.selectLatestQuarter();
    }
  }

  setTransactionTimeframe(view: DetailTimeframe): void {
    this.setTimeframe(view);
  }

  setQuarterScope(scope: number | 'all'): void {
    if (scope === 'all') {
      return;
    }
    this.setQuarter(scope);
  }

  /** Quarters without data are disabled, so the year never changes here. */
  setQuarter(quarter: number): void {
    if (!hasQuarterData(this.dataPeriods(), quarter, this.year())) {
      return;
    }
    this.quarterScope.set(quarter);
    this.quarter.set(quarter);
  }

  setYear(year: number): void {
    this.year.set(year);
    if (this.timeframe() === 'quarterly' && !hasQuarterData(this.dataPeriods(), this.quarterScope(), year)) {
      this.selectLatestQuarter(year);
    }
  }

  onTransactionSearch(event: { blockId: string; search: string }): void {
    this.transactionSearch$.next(event);
  }

  onTransactionHubCategoryChange(categoryId: InvestorTransactionCategoryId): void {
    this.transactionHubCategory.set(categoryId);
    this.loadTransactionHubTableOnce(categoryId);
    this.loadAllTransactionHubFilters();
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
    this.transactionHubTablesLoaded.clear();
    this.cancelTransactionHubPrefetch();
    this.loadTransactionHubTableOnce(untracked(() => this.transactionHubCategory()));
    this.loadAllTransactionHubFilters();
    // Open tab first; the others follow shortly so every tab count still fills in.
    this.transactionHubPrefetchTimer = setTimeout(() => {
      this.transactionHubPrefetchTimer = null;
      for (const categoryId of this.visibleTransactionHubCategories()) {
        this.loadTransactionHubTableOnce(categoryId);
      }
    }, TRANSACTION_HUB_PREFETCH_DELAY_MS);
  }

  private loadTransactionHubTableOnce(categoryId: InvestorTransactionCategoryId): void {
    if (
      this.transactionHubTablesLoaded.has(categoryId) ||
      !this.visibleTransactionHubCategories().includes(categoryId)
    ) {
      return;
    }
    this.transactionHubTablesLoaded.add(categoryId);
    const state = untracked(() => this.detailState());
    this.loadTransactionHubCategory(categoryId, hubCategorySearchKey(categoryId, state), 1);
  }

  private cancelTransactionHubPrefetch(): void {
    if (this.transactionHubPrefetchTimer != null) {
      clearTimeout(this.transactionHubPrefetchTimer);
      this.transactionHubPrefetchTimer = null;
    }
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

    if (filterLoadKey !== this.lastTransactionHubFilterPeriodLoadKey) {
      this.lastTransactionHubFilterPeriodLoadKey = filterLoadKey;
      this.transactionHubFiltersLoaded.clear();
    }

    // Filter options only feed the open tab's dropdown; other tabs load theirs when opened.
    const categoryId = untracked(() => this.transactionHubCategory());
    if (
      this.transactionHubFiltersLoaded.has(categoryId) ||
      !this.visibleTransactionHubCategories().includes(categoryId)
    ) {
      return;
    }
    this.transactionHubFiltersLoaded.add(categoryId);
    this.loadTransactionHubFilters(categoryId);
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

  /** Keeps a valid quarter selected once this investor's data quarters are known. */
  private ensureQuarterlySelection(): void {
    const periods = this.dataPeriods();
    if (hasQuarterData(periods, this.quarterScope(), this.year())) {
      return;
    }
    const year = this.year();
    this.selectLatestQuarter(year != null && periods.some((p) => p.calendarYear === year) ? year : null);
  }

  /** Most recent quarter with data, within `year` when given. */
  private selectLatestQuarter(year: number | null = null): void {
    const latest = latestQuarterWithData(this.dataPeriods(), year);
    if (!latest) {
      return;
    }
    this.year.set(latest.year);
    this.quarter.set(latest.quarter);
    this.quarterScope.set(latest.quarter);
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

  /** Restores the list page's quarter; otherwise the most recent quarter with data. */
  private applyPendingListPeriod(): void {
    const pending = this.pendingListPeriod;
    this.pendingListPeriod = null;

    if (pending?.quarter != null && pending.year != null) {
      this.quarterScope.set(pending.quarter);
      this.quarter.set(pending.quarter);
      this.year.set(pending.year);
    }
    if (this.timeframe() === 'quarterly') {
      this.ensureQuarterlySelection();
    }
  }
}
