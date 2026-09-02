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
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, distinctUntilChanged, map, Observable, of, Subject } from 'rxjs';

import { KsCurrencyPipe } from '../../../../shared/pipes/ks-currency.pipe';
import { CapitalFundsApiService } from '../../shared/services/capital-funds-api.service';
import { InvestorTransactionTableFiltersDto } from '../../shared/models/api.models';
import { FundTableRow } from '../../shared/utils/fund-list-row.util';
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import {
  EMPTY_FUNDS_FILTER_OPTIONS,
  FundsFilterOptions,
  normalizeFundsFilterOptions,
} from '../../shared/utils/fund-filter-options.util';
import { buildQuarterlyTransactionPeriodParams } from '../../shared/utils/quarterly-transaction-period.util';
import {
  isServerSortedTransactionTable,
  resolveTransactionTableSort,
  TransactionTableSortDir,
} from '../../shared/utils/transaction-table-period.util';
import { InvestorDetailSidebarComponent } from '../../investors/investor-detail/investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from '../../investors/investor-detail/investor-detail-block/investor-detail-block.component';
import { InvestorDetailBlock } from '../../investors/investor-detail/models/investor-detail-block.models';
import { FundsApiActions } from '../../store';
import { selectFundsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { INVESTMENT_DETAIL_SIDEBAR_SECTIONS } from './models/investment-detail-sidebar.config';
import {
  buildFlatInvestmentBlocks,
  FundOverviewInput,
  InvestmentDetailSectionId,
  InvestmentDetailTimeframe,
  kpiCardsFromListRow,
  kpiCardsFromFundDetail,
  pickOverviewLabel,
  readFundDetailSummaryString,
} from './utils/investment-detail-tables.util';
import { fundDetailHasProfileData, readFundDetailKey, readFundDetailString } from './utils/investment-detail-api.util';
import {
  buildFundTransactionHubBlock,
  fundHubCategoryInvestorName,
  fundHubCategorySearchKey,
  fundHubSortBlockId,
  fundShowsNetAssetsHub,
  normalizeFundTransactionTableFilters,
} from './utils/investment-transaction-hub.util';
import {
  InvestorTransactionCategoryId,
  InvestorTransactionFilterOption,
} from '../../investors/investor-detail/models/investor-transaction-hub.models';
import { INVESTMENT_DETAIL_DUMMY } from './data/investment-detail-dummy.data';

interface TransactionTableSort {
  sortBy: string;
  sortDir: TransactionTableSortDir;
}

interface InvestorReturnContext {
  investorKey: number;
  investorName: string;
  investorRow?: InvestorTableRow | null;
}

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    MatIconModule,
    KsCurrencyPipe,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  templateUrl: './investment-detail.component.html',
  styleUrl: './investment-detail.component.scss',
})
export class InvestmentDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fundsApi = inject(CapitalFundsApiService);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly stickyChromeRef = viewChild<ElementRef<HTMLElement>>('stickyChrome');

  private static readonly SECTION_SCROLL_GAP_PX = 8;

  readonly sidebarSections = INVESTMENT_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestmentDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<InvestmentDetailTimeframe>('ltd');
  readonly quarterScope = signal<number | 'all'>('all');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<FundsFilterOptions>(EMPTY_FUNDS_FILTER_OPTIONS);

  readonly fundKey = signal<number | null>(null);
  readonly listRow = signal<FundTableRow | null>(null);
  readonly returnToInvestor = signal<InvestorReturnContext | null>(null);

  readonly backLinkLabel = computed(() => {
    const investor = this.returnToInvestor();
    if (!investor?.investorKey) {
      return 'Back to Investments';
    }
    const name = investor.investorName?.trim();
    return name ? `Back to ${name}` : 'Back to Investor';
  });

  private readonly detailState = this.store.selectSignal(selectFundsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly error = computed(() => {
    if (this.listRow()) {
      return null;
    }
    return this.detailState().error;
  });
  readonly detail = computed(() => this.detailState().detail);

  readonly contentLoading = computed(
    () => this.loading() && !this.detail() && !this.listRow(),
  );
  readonly contentLoadingMessage = computed(() => 'Loading investment profile…');

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

  readonly fundName = computed(
    () =>
      pickOverviewLabel(
        readFundDetailString(this.detail(), 'fund_name', 'fundName'),
        this.listRow()?.name,
        this.detail()?.summary?.fundName,
      ) || INVESTMENT_DETAIL_DUMMY.fundName,
  );

  readonly fundType = computed(() =>
    pickOverviewLabel(
      this.listRow()?.fundType,
      readFundDetailSummaryString(
        this.detail(),
        'fund_type_name',
        'fundTypeName',
        'fund_type',
        'fundType',
        'FundType',
      ),
    ),
  );

  readonly strategyLabel = computed(() => {
    const strategy = pickOverviewLabel(
      this.listRow()?.strategy,
      readFundDetailSummaryString(
        this.detail(),
        'strategy',
        'fund_strategy_name',
        'fundStrategyName',
        'fund_strategy',
        'fund_category',
        'fundCategory',
      ),
    );
    if (strategy !== '—') {
      return strategy;
    }
    return this.fundType();
  });

  readonly investedPercent = computed(() => {
    const row = this.listRow();
    if (row?.investedPercent != null) {
      return row.investedPercent;
    }
    return INVESTMENT_DETAIL_DUMMY.investedPercent;
  });

  readonly headerBadgeLabel = computed(() => {
    const label = this.strategyLabel();
    return label && label !== '—' ? label : '';
  });

  readonly subtitleText = computed(() => {
    const fundType = this.fundType();
    const typePart = fundType && fundType !== '—' ? fundType : '';
    const fundId =
      readFundDetailKey(this.detail()) ??
      this.detail()?.summary?.fundId ??
      this.fundKey();
    const fundIdPart = fundId != null ? `Fund ID: ${fundId}` : '';
    const kpi = this.kpiCards();
    const pctPart =
      kpi.investedPercent > 0 ? `${kpi.investedPercent.toFixed(1)}% invested` : '';
    return [
      typePart,
      fundIdPart,
      pctPart,
    ]
      .filter(Boolean)
      .join(' · ');
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

  readonly netInvestedHint = computed(() => {
    if (this.timeframe() === 'daily') {
      return 'ITD-adjusted';
    }
    if (this.timeframe() === 'quarterly') {
      return 'ITD deployed';
    }
    return 'ITD deployed';
  });

  readonly reservedHint = computed(() =>
    this.timeframe() === 'daily' ? 'Unfunded' : 'Uncalled',
  );

  readonly kpiCards = computed(() => {
    const detail = this.detail();
    if (fundDetailHasProfileData(detail)) {
      return kpiCardsFromFundDetail(detail);
    }
    return kpiCardsFromListRow(this.listRow(), this.timeframe());
  });

  readonly tableContextKey = computed(() => {
    const fundKey = this.fundKey();
    const timeframe = this.timeframe();
    const dateKey = timeframe === 'quarterly' ? this.dateKey() : null;
    return `${fundKey ?? ''}:${timeframe}:${dateKey ?? ''}`;
  });

  private readonly hubResetKey = computed(() => `${this.fundKey() ?? ''}:${this.timeframe()}`);

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
  readonly transactionHubAppliedInvestorName = computed(() => {
    const name = fundHubCategoryInvestorName(this.transactionHubCategory(), this.detailState());
    return name || 'all';
  });

  readonly showNetAssetsHubCategory = computed(() => fundShowsNetAssetsHub(this.fundType()));

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    const overview: FundOverviewInput = {
      fundName: this.fundName(),
      fundType: this.fundType(),
      strategy: this.strategyLabel(),
      fundId: this.detail()?.summary?.fundId ?? readFundDetailKey(this.detail()) ?? INVESTMENT_DETAIL_DUMMY.fundId,
    };
    const base = buildFlatInvestmentBlocks(
      state.detail,
      state.assets,
      {
        page: state.assetsPage,
        pageSize: state.assetsPageSize,
        totalPages: state.assetsTotalPages,
        totalCount: state.assetsTotalCount,
        hasPreviousPage: state.assetsHasPreviousPage,
        hasNextPage: state.assetsHasNextPage,
      },
      state.capitalActivities,
      state.distributionTable,
      state.irr,
      this.kpiCards(),
      this.timeframe(),
      this.periodLabel(),
      overview,
    );

    return base.map((item) => {
      if (item.block.kind !== 'transaction-hub') {
        return item;
      }
      const categoryId = this.transactionHubCategory();
      const investorOptions = this.transactionHubFilterOptions()[categoryId];
      return {
        ...item,
        block: buildFundTransactionHubBlock(
          state,
          categoryId,
          this.transactionHubPeriodSummary(),
          investorOptions,
          this.showNetAssetsHubCategory(),
        ),
      };
    });
  });

  constructor() {
    effect(() => {
      if (!this.showNetAssetsHubCategory() && this.transactionHubCategory() === 'net-assets') {
        untracked(() => this.transactionHubCategory.set('capital-activities'));
      }
    });

    this.transactionSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.blockId === b.blockId && a.search === b.search),
        takeUntilDestroyed(),
      )
      .subscribe(({ blockId, search }) => {
        if (blockId === 'fund-transactions') {
          this.loadTransactionHubCategory(this.transactionHubCategory(), search);
          return;
        }
        this.loadTransactionTable(blockId, search);
      });

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

    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('fundKey'))),
        takeUntilDestroyed(),
      )
      .subscribe((fundKey) => {
        if (!Number.isFinite(fundKey) || fundKey <= 0) {
          void this.router.navigate(['/capital-dashboard/investment']);
          return;
        }

        this.fundKey.set(fundKey);
        this.loadFundData(fundKey);
      });

    const navigationState = (history.state ?? {}) as {
      fundRow?: FundTableRow;
      returnToInvestor?: InvestorReturnContext;
      reportingPeriod?: string;
      listView?: 'ltd' | 'quarterly' | 'daily';
      listQuarter?: number | null;
      listYear?: number | null;
    };
    if (navigationState.fundRow) {
      this.listRow.set(navigationState.fundRow);
    }
    const returnToInvestor = navigationState.returnToInvestor;
    if (
      returnToInvestor &&
      Number.isFinite(returnToInvestor.investorKey) &&
      returnToInvestor.investorKey > 0
    ) {
      this.returnToInvestor.set(returnToInvestor);
    }
    this.applyListReportingPeriod(navigationState);

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(FundsApiActions.clearDetail());
    });

    effect(() => {
      const resetKey = this.hubResetKey();
      const view = this.timeframe();
      const fundKey = this.fundKey();

      untracked(() => {
        if (resetKey !== this.lastHubResetKey) {
          this.lastHubResetKey = resetKey;
          this.transactionSort.set({});
          if (fundKey != null) {
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

      if (fundKey == null) {
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
        fundKey,
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
            this.getStickyScrollOffset() + InvestmentDetailComponent.SECTION_SCROLL_GAP_PX,
        });
      });

      onCleanup(() => {
        cancelAnimationFrame(frame);
        detachSpy?.();
        resizeObserver?.disconnect();
      });
    });
  }

  setTimeframe(view: InvestmentDetailTimeframe): void {
    this.timeframe.set(view);
    if (view === 'quarterly') {
      this.quarterScope.set('all');
      this.ensureQuarterlySelection(this.filterOptions());
    }
  }

  setTransactionTimeframe(view: InvestmentDetailTimeframe): void {
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
    if (categoryId === 'net-assets' && !this.showNetAssetsHubCategory()) {
      return;
    }
    this.transactionHubCategory.set(categoryId);
  }

  onTransactionHubPageChange(page: number): void {
    this.loadTransactionHubCategory(
      this.transactionHubCategory(),
      fundHubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
      page,
    );
  }

  onTransactionHubFundFilterApply(value: string): void {
    const investorName = value === 'all' ? '' : value;
    this.loadTransactionHubCategory(
      this.transactionHubCategory(),
      fundHubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
      1,
      investorName,
    );
  }

  onUnderlyingAssetsPageChange(page: number): void {
    this.loadFundAssetsPage(page);
  }

  onTransactionSort(event: { blockId: string; sortBy: string; defaultDir: TransactionTableSortDir }): void {
    const blockId =
      event.blockId === 'fund-transactions'
        ? fundHubSortBlockId(this.transactionHubCategory())
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
      if (event.blockId === 'fund-transactions') {
        this.loadTransactionHubCategory(
          this.transactionHubCategory(),
          fundHubCategorySearchKey(this.transactionHubCategory(), this.detailState()),
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
        fundHubSortBlockId(this.transactionHubCategory()),
        this.transactionSort(),
      )?.sortBy ?? null;
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return null;
    }
    return resolveTransactionTableSort(block.id, this.transactionSort())?.sortBy ?? null;
  }

  tableSortDirForBlock(block: InvestorDetailBlock): TransactionTableSortDir {
    if (block.kind === 'transaction-hub') {
      return (
        resolveTransactionTableSort(fundHubSortBlockId(this.transactionHubCategory()), this.transactionSort())
          ?.sortDir ?? 'desc'
      );
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return 'desc';
    }
    return resolveTransactionTableSort(block.id, this.transactionSort())?.sortDir ?? 'desc';
  }

  tableLoadingForBlock(block: InvestorDetailBlock): boolean {
    if (block.kind === 'transaction-hub') {
      return block.loading;
    }
    if (block.kind === 'table' && block.id === 'underlying-assets') {
      return this.detailState().assetsLoading;
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
      return !!fundHubCategorySearchKey(this.transactionHubCategory(), this.detailState()).trim();
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
    this.activeSectionId.set(sectionId as InvestmentDetailSectionId);

    requestAnimationFrame(() => {
      const main = this.mainContentRef()?.nativeElement;
      if (!main) {
        this.scrollSpyPaused.set(false);
        return;
      }

      if (sectionId === 'overview') {
        main.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const target = main.querySelector<HTMLElement>(`#inv-section-${sectionId}`);
        if (target) {
          const mainRect = main.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const stickyOffset =
            this.getStickyScrollOffset() + InvestmentDetailComponent.SECTION_SCROLL_GAP_PX;
          const top = main.scrollTop + (targetRect.top - mainRect.top) - stickyOffset;
          main.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      }

      window.setTimeout(() => this.scrollSpyPaused.set(false), 800);
    });
  }

  private getStickyScrollOffset(): number {
    return this.stickyChromeRef()?.nativeElement.offsetHeight ?? 0;
  }

  backToList(): void {
    const investor = this.returnToInvestor();
    if (investor?.investorKey) {
      void this.router.navigate(['/capital-dashboard/investor', investor.investorKey], {
        state: {
          ...(investor.investorRow ? { investorRow: investor.investorRow } : {}),
          reportingPeriod: this.periodLabel(),
          listView: this.timeframe(),
          listQuarter: this.quarter(),
          listYear: this.year(),
        },
      });
      return;
    }

    void this.router.navigate(['/capital-dashboard/investment']);
  }

  formatInvestedPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatTvpi(value: number | null): string {
    return this.formatHeaderMultiple(value);
  }

  formatHeaderMultiple(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value) || value <= 0) {
      return '--';
    }
    return `${value.toFixed(2)}x`;
  }

  private loadFundData(fundKey: number): void {
    this.store.dispatch(FundsApiActions.loadDetail({ fundKey }));
    this.loadFundAssetsPage(1);
  }

  private loadFundAssetsPage(page: number): void {
    const fundKey = this.fundKey();
    if (fundKey == null) {
      return;
    }

    this.store.dispatch(
      FundsApiActions.loadFundAssetsPage({
        fundKey,
        page,
        search: '',
        replace: true,
      }),
    );
  }

  private visibleTransactionHubCategories(): InvestorTransactionCategoryId[] {
    if (this.showNetAssetsHubCategory()) {
      return InvestmentDetailComponent.TRANSACTION_HUB_CATEGORIES;
    }
    return InvestmentDetailComponent.TRANSACTION_HUB_CATEGORIES.filter(
      (categoryId) => categoryId !== 'net-assets',
    );
  }

  private loadAllTransactionHubTables(): void {
    const state = untracked(() => this.detailState());
    for (const categoryId of this.visibleTransactionHubCategories()) {
      this.loadTransactionHubCategory(
        categoryId,
        fundHubCategorySearchKey(categoryId, state),
        1,
      );
    }
    this.loadAllTransactionHubFilters();
  }

  private loadAllTransactionHubFilters(): void {
    const fundKey = this.fundKey();
    if (fundKey == null) {
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
      fundKey,
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
    if (categoryId === 'net-assets' && !this.showNetAssetsHubCategory()) {
      return;
    }

    const fundKey = this.fundKey();
    if (fundKey == null) {
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

    this.getTransactionHubFilters$(categoryId, fundKey, timeframe, periodParams)
      .pipe(
        catchError(() => of({ items: [] } as InvestorTransactionTableFiltersDto)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        if (loadSeq !== this.transactionHubFilterLoadSeq[categoryId]) {
          return;
        }

        const options = normalizeFundTransactionTableFilters(response);
        this.transactionHubFilterOptions.update((state) => ({
          ...state,
          [categoryId]: options,
        }));
      });
  }

  private getTransactionHubFilters$(
    categoryId: InvestorTransactionCategoryId,
    fundKey: number,
    timeframe: InvestmentDetailTimeframe,
    periodParams: { dateKey?: number; calendarYear?: number } = {},
  ): Observable<InvestorTransactionTableFiltersDto> {
    switch (categoryId) {
      case 'capital-activities':
        return this.fundsApi.getFundCapitalActivitiesFilters(fundKey, timeframe, periodParams);
      case 'distributions':
        return this.fundsApi.getFundDistributionTableFilters(fundKey, timeframe, periodParams);
      case 'irrs':
        return this.fundsApi.getFundIrrFilters(fundKey, timeframe, periodParams);
      case 'capital-obligations':
        return this.fundsApi.getFundCapitalObligationsFilters(fundKey, timeframe, periodParams);
      case 'net-assets':
        return this.fundsApi.getFundNetAssetsFilters(fundKey, timeframe, periodParams);
      default:
        return of({ items: [] });
    }
  }

  private loadTransactionHubCategory(
    categoryId: InvestorTransactionCategoryId,
    search: string,
    page = 1,
    investorNameInput?: string,
  ): void {
    if (categoryId === 'net-assets' && !this.showNetAssetsHubCategory()) {
      return;
    }

    const fundKey = this.fundKey();
    if (fundKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.year() == null) {
      return;
    }
    if (timeframe === 'quarterly' && this.quarterScope() !== 'all' && this.dateKey() == null) {
      return;
    }

    const sortBlockId = fundHubSortBlockId(categoryId);
    const sort = resolveTransactionTableSort(sortBlockId, untracked(() => this.transactionSort()));
    const investorName =
      investorNameInput ?? fundHubCategoryInvestorName(categoryId, this.detailState());
    const periodParams = this.quarterlyTransactionPeriodParams();
    const request = {
      fundKey,
      timeframe,
      page,
      search,
      replace: true,
      ...periodParams,
      ...(investorName ? { investorName } : {}),
      ...(sort ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
    };

    switch (categoryId) {
      case 'capital-activities':
        this.store.dispatch(FundsApiActions.loadFundCapitalActivitiesPage(request));
        break;
      case 'distributions':
        this.store.dispatch(FundsApiActions.loadFundDistributionTablePage(request));
        break;
      case 'irrs':
        this.store.dispatch(FundsApiActions.loadFundIrrPage(request));
        break;
      case 'capital-obligations':
        this.store.dispatch(FundsApiActions.loadFundCapitalObligationsPage(request));
        break;
      case 'net-assets':
        this.store.dispatch(FundsApiActions.loadFundNetAssetsPage(request));
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
    const categoryId = blockId as InvestorTransactionCategoryId;
    if (
      categoryId !== 'capital-activities' &&
      categoryId !== 'distributions' &&
      categoryId !== 'irrs' &&
      categoryId !== 'capital-obligations' &&
      categoryId !== 'net-assets'
    ) {
      return;
    }

    this.loadTransactionHubCategory(categoryId, search, 1);
  }

  private quarterlyTransactionPeriodParams() {
    return buildQuarterlyTransactionPeriodParams(
      this.timeframe(),
      this.quarterScope(),
      this.year(),
      this.dateKey(),
    );
  }

  private ensureQuarterlySelection(options: FundsFilterOptions): void {
    const periods = options.quarterlyPeriods;
    if (!periods.length) {
      this.quarter.set(null);
      this.year.set(null);
      return;
    }

    const year = this.year();
    if (year != null && periods.some((period) => period.calendarYear === year)) {
      return;
    }

    const first = periods[0];
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

    if (view === 'quarterly') {
      // Hub reset runs when timeframe changes and would wipe quarterScope — seed after reset.
      this.pendingListPeriod = {
        quarter: state.listQuarter ?? null,
        year: state.listYear ?? null,
      };
    } else {
      this.pendingListPeriod = null;
    }

    this.timeframe.set(view);
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
    const currentQuarter = this.quarterScope();
    if (typeof currentQuarter === 'number' && !quartersForYear.includes(currentQuarter)) {
      const next = quartersForYear[0] ?? null;
      if (next == null) {
        this.quarterScope.set('all');
        this.quarter.set(null);
        return;
      }
      this.quarterScope.set(next);
      this.quarter.set(next);
    }
  }
}
