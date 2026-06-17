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
import { catchError, debounceTime, distinctUntilChanged, map, of, Subject } from 'rxjs';

import { KsCurrencyPipe } from '../../../../shared/pipes/ks-currency.pipe';
import { CapitalFundsApiService } from '../../shared/services/capital-funds-api.service';
import { FundTableRow } from '../../shared/utils/fund-list-row.util';
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import {
  EMPTY_FUNDS_FILTER_OPTIONS,
  FundsFilterOptions,
  normalizeFundsFilterOptions,
} from '../../shared/utils/fund-filter-options.util';
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
  pickOverviewLabel,
  readFundDetailSummaryString,
} from './utils/investment-detail-tables.util';
import {
  buildFundTransactionHubBlock,
  fundHubCategorySearchKey,
  fundHubSortBlockId,
} from './utils/investment-transaction-hub.util';
import { InvestorTransactionCategoryId } from '../../investors/investor-detail/models/investor-transaction-hub.models';
import { INVESTMENT_DETAIL_DUMMY } from './data/investment-detail-dummy.data';

type TransactionTableSortDir = 'asc' | 'desc';

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

  private readonly filterReloading = signal(false);

  readonly contentLoading = computed(() => {
    if (this.listRow()) {
      const detailPending = this.detailState().loading && !this.detailState().detail;
      return detailPending || this.filterReloading();
    }
    return this.loading() || this.filterReloading();
  });
  readonly contentLoadingMessage = computed(() =>
    this.loading() ? 'Loading investment profile…' : 'Loading data…',
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

  readonly fundName = computed(
    () =>
      this.listRow()?.name ??
      this.detail()?.summary.fundName ??
      INVESTMENT_DETAIL_DUMMY.fundName,
  );

  readonly fundType = computed(() =>
    pickOverviewLabel(
      this.listRow()?.fundType,
      readFundDetailSummaryString(this.detail(), 'fund_type', 'fundType', 'FundType'),
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

  readonly subtitleText = computed(() => {
    const status = INVESTMENT_DETAIL_DUMMY.listingStatus;
    const fundId = this.detail()?.summary.fundId ?? this.fundKey() ?? INVESTMENT_DETAIL_DUMMY.fundId;
    const pct = this.investedPercent();
    const pctLabel = pct != null ? `${pct.toFixed(1)}% Invested` : '';
    return [status, `Fund ID: ${fundId}`, pctLabel].filter(Boolean).join(' · ');
  });

  readonly periodLabel = computed(() => {
    if (this.timeframe() === 'quarterly') {
      const quarter = this.quarter();
      const year = this.year();
      if (quarter == null || year == null) {
        return 'Quarterly';
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

  readonly kpiCards = computed(() => kpiCardsFromListRow(this.listRow(), this.timeframe()));

  readonly tableContextKey = computed(() => {
    const fundKey = this.fundKey();
    const timeframe = this.timeframe();
    const dateKey = timeframe === 'quarterly' ? this.dateKey() : null;
    return `${fundKey ?? ''}:${timeframe}:${dateKey ?? ''}`;
  });

  private readonly transactionSearch$ = new Subject<{ blockId: string; search: string }>();
  private readonly transactionSort = signal<Record<string, TransactionTableSort>>({});
  readonly transactionHubCategory = signal<InvestorTransactionCategoryId>('capital-activities');
  readonly transactionHubPage = signal(1);
  readonly transactionHubFundFilter = signal('all');

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    const overview: FundOverviewInput = {
      fundName: this.fundName(),
      fundType: this.fundType(),
      strategy: this.strategyLabel(),
      fundId: this.detail()?.summary.fundId ?? INVESTMENT_DETAIL_DUMMY.fundId,
    };
    const base = buildFlatInvestmentBlocks(
      state.detail,
      state.assets,
      state.commitments,
      state.unfundedCommitments,
      state.fundInvestments,
      state.fundDistributions,
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
      return {
        ...item,
        block: buildFundTransactionHubBlock(
          state,
          this.transactionHubCategory(),
          this.transactionHubPeriodSummary(),
          this.transactionHubPage(),
          {
            fundCode: this.transactionHubFundFilter(),
          },
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

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(FundsApiActions.clearDetail());
    });

    effect(() => {
      const view = this.timeframe();
      const fundKey = this.fundKey();
      if (fundKey == null) {
        return;
      }
      if (view === 'quarterly' && this.dateKey() == null) {
        return;
      }
      this.loadSectionData(fundKey, view);
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

    effect(() => {
      if (!this.filterReloading()) {
        return;
      }

      const state = this.detailState();
      const sectionLoading =
        state.commitmentsLoading ||
        state.unfundedCommitmentsLoading ||
        state.fundInvestmentsLoading ||
        state.fundDistributionsLoading ||
        state.navLoading ||
        state.capitalActivitiesLoading ||
        state.distributionTableLoading ||
        state.irrLoading;

      if (!sectionLoading) {
        this.filterReloading.set(false);
      }
    });

    effect(() => {
      this.tableContextKey();
      this.transactionSort.set({});
      this.transactionHubPage.set(1);
      this.transactionHubFundFilter.set('all');
    });
  }

  setTimeframe(view: InvestmentDetailTimeframe): void {
    this.timeframe.set(view);
    if (view === 'quarterly') {
      this.ensureQuarterlySelection(this.filterOptions());
    }
  }

  setTransactionTimeframe(view: InvestmentDetailTimeframe): void {
    this.setTimeframe(view);
    this.transactionHubPage.set(1);
  }

  setQuarter(quarter: number): void {
    this.quarter.set(quarter);
    this.alignYearToQuarter();
  }

  setYear(year: number): void {
    this.year.set(year);
    this.alignQuarterToYear();
  }

  onTransactionSearch(event: { blockId: string; search: string }): void {
    if (event.blockId === 'fund-transactions') {
      this.transactionHubPage.set(1);
    }
    this.transactionSearch$.next(event);
  }

  onTransactionHubCategoryChange(categoryId: InvestorTransactionCategoryId): void {
    this.transactionHubCategory.set(categoryId);
    this.transactionHubPage.set(1);
    this.transactionHubFundFilter.set('all');
    this.loadTransactionHubCategory(categoryId, fundHubCategorySearchKey(categoryId, this.detailState()));
  }

  onTransactionHubPageChange(page: number): void {
    this.transactionHubPage.set(page);
  }

  onTransactionHubFundFilter(value: string): void {
    this.transactionHubFundFilter.set(value);
    this.transactionHubPage.set(1);
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
    return blockId === 'capital-activities' || blockId === 'distributions' || blockId === 'irrs';
  }

  tableSortColumnForBlock(block: InvestorDetailBlock): string | null {
    if (block.kind === 'transaction-hub') {
      return this.transactionSort()[fundHubSortBlockId(this.transactionHubCategory())]?.sortBy ?? null;
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return null;
    }
    return this.transactionSort()[block.id]?.sortBy ?? null;
  }

  tableSortDirForBlock(block: InvestorDetailBlock): TransactionTableSortDir {
    if (block.kind === 'transaction-hub') {
      return this.transactionSort()[fundHubSortBlockId(this.transactionHubCategory())]?.sortDir ?? 'desc';
    }
    if (block.kind !== 'table' || !block.showToolbar) {
      return 'desc';
    }
    return this.transactionSort()[block.id]?.sortDir ?? 'desc';
  }

  tableLoadingForBlock(block: InvestorDetailBlock): boolean {
    if (block.kind === 'transaction-hub') {
      return block.loading;
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
        state: investor.investorRow ? { investorRow: investor.investorRow } : undefined,
      });
      return;
    }

    void this.router.navigate(['/capital-dashboard/investment']);
  }

  formatInvestedPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatTvpi(value: number): string {
    return `${value.toFixed(2)}x`;
  }

  private loadFundData(fundKey: number): void {
    this.store.dispatch(FundsApiActions.loadDetail({ fundKey }));
    this.loadSectionData(fundKey, this.timeframe());
  }

  private loadSectionData(fundKey: number, timeframe: InvestmentDetailTimeframe): void {
    this.filterReloading.set(true);
    const request = this.buildTablePageRequest(fundKey, timeframe);

    this.store.dispatch(FundsApiActions.loadFundCommitmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundUnfundedCommitmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundInvestmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundDistributionsPage(request));
    this.store.dispatch(FundsApiActions.loadFundNavPage(request));
    this.store.dispatch(FundsApiActions.loadFundAssetsPage({ fundKey, page: 1, search: '' }));
    this.store.dispatch(FundsApiActions.loadFundInvestorsPage({ fundKey, page: 1, search: '' }));
    this.store.dispatch(FundsApiActions.loadFundCapitalActivitiesPage(request));
    this.store.dispatch(FundsApiActions.loadFundDistributionTablePage(request));
    this.store.dispatch(FundsApiActions.loadFundIrrPage(request));
  }

  private loadTransactionHubCategory(
    categoryId: InvestorTransactionCategoryId,
    search: string,
    page = 1,
  ): void {
    const fundKey = this.fundKey();
    if (fundKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.dateKey() == null) {
      return;
    }

    const sortBlockId = fundHubSortBlockId(categoryId);
    const sort = untracked(() => this.transactionSort()[sortBlockId]);
    const request = {
      fundKey,
      timeframe,
      page,
      search,
      replace: page === 1,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
      ...(sort?.sortBy ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
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
    }
    this.loadTransactionTable(blockId, search);
  }

  private loadTransactionTable(blockId: string, search: string): void {
    const fundKey = this.fundKey();
    if (fundKey == null) {
      return;
    }

    const timeframe = this.timeframe();
    if (timeframe === 'quarterly' && this.dateKey() == null) {
      return;
    }

    const request = this.buildTransactionTableRequest(fundKey, timeframe, blockId, search);

    switch (blockId) {
      case 'capital-activities':
        this.store.dispatch(FundsApiActions.loadFundCapitalActivitiesPage(request));
        break;
      case 'distributions':
        this.store.dispatch(FundsApiActions.loadFundDistributionTablePage(request));
        break;
      case 'irrs':
        this.store.dispatch(FundsApiActions.loadFundIrrPage(request));
        break;
    }
  }

  private buildTablePageRequest(fundKey: number, timeframe: InvestmentDetailTimeframe, search = '') {
    return {
      fundKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
    };
  }

  private buildTransactionTableRequest(
    fundKey: number,
    timeframe: InvestmentDetailTimeframe,
    blockId: string,
    search = '',
  ) {
    const sort = untracked(() => this.transactionSort()[blockId]);
    return {
      fundKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
      ...(sort?.sortBy ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
    };
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
