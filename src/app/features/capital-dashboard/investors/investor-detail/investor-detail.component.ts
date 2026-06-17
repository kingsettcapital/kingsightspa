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
import { CapitalInvestorsApiService } from '../../shared/services/capital-investors-api.service';
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import { fundTableRowFromFundExposure } from '../../shared/utils/fund-list-row.util';
import { InvestorDetailTableRow } from './models/investor-detail-table.models';
import {
  EMPTY_INVESTORS_FILTER_OPTIONS,
  InvestorsFilterOptions,
  normalizeInvestorsFilterOptions,
} from '../../shared/utils/investor-filter-options.util';
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
  buildFundExposureTable,
  distributionAmountRows,
  InvestorDetailSectionId,
  kpiCardsFromListRow,
  mergeKpiCardsWithFundExposure,
} from './utils/investor-detail-tables.util';

type DetailTimeframe = 'ltd' | 'quarterly' | 'daily';
type TransactionTableSortDir = 'asc' | 'desc';

interface TransactionTableSort {
  sortBy: string;
  sortDir: TransactionTableSortDir;
}

@Component({
  selector: 'app-investor-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    MatIconModule,
    KsCurrencyPipe,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  templateUrl: './investor-detail.component.html',
  styleUrl: './investor-detail.component.scss',
})
export class InvestorDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly investorsApi = inject(CapitalInvestorsApiService);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly stickyChromeRef = viewChild<ElementRef<HTMLElement>>('stickyChrome');

  private static readonly SECTION_SCROLL_GAP_PX = 8;

  readonly sidebarSections = INVESTOR_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestorDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<DetailTimeframe>('ltd');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<InvestorsFilterOptions>(EMPTY_INVESTORS_FILTER_OPTIONS);

  readonly investorKey = signal<number | null>(null);
  readonly listRow = signal<InvestorTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectInvestorsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly error = computed(() => this.detailState().error);
  readonly detail = computed(() => this.detailState().detail);

  private readonly filterReloading = signal(false);

  readonly contentLoading = computed(() => this.loading() || this.filterReloading());
  readonly contentLoadingMessage = computed(() =>
    this.loading() ? 'Loading investor profile…' : 'Loading data…',
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

  readonly investorName = computed(
    () =>
      this.listRow()?.name ??
      this.detail()?.summary.investorName ??
      'Investor',
  );

  readonly investorType = computed(
    () =>
      this.listRow()?.investorType ??
      this.detail()?.summary.investorType ??
      '—',
  );

  readonly relationshipLabel = computed(() => this.listRow()?.relationship ?? '—');
  readonly contactName = computed(() => this.listRow()?.contactName ?? '—');
  readonly fundsCount = computed(
    () => this.listRow()?.fundsCount ?? this.detail()?.summary.investmentsCount ?? 0,
  );

  readonly subtitleText = computed(() => {
    const type = this.investorType();
    const funds = this.fundsCount();
    const contact = this.contactName();
    const contactPart = contact && contact !== '—' ? `Contact: ${contact}` : '';
    return [type, `${funds} fund${funds === 1 ? '' : 's'}`, contactPart].filter(Boolean).join(' • ');
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

  readonly fundExposureTable = computed(() => {
    const state = this.detailState();
    return buildFundExposureTable(
      state.investments,
      state.commitments,
      state.unfundedCommitments,
      state.capitalInvestments,
      distributionAmountRows(state.investorDistributions),
      state.capitalActivities,
      state.distributionTable,
    );
  });

  readonly kpiCards = computed(() =>
    mergeKpiCardsWithFundExposure(
      kpiCardsFromListRow(this.listRow()),
      this.fundExposureTable(),
    ),
  );

  readonly tableContextKey = computed(() => {
    const investorKey = this.investorKey();
    const timeframe = this.timeframe();
    const dateKey = timeframe === 'quarterly' ? this.dateKey() : null;
    return `${investorKey ?? ''}:${timeframe}:${dateKey ?? ''}`;
  });

  private readonly transactionSearch$ = new Subject<{ blockId: string; search: string }>();
  private readonly transactionSort = signal<Record<string, TransactionTableSort>>({});

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    return buildFlatInvestorBlocks(
      state.detail,
      state.investments,
      state.commitments,
      state.unfundedCommitments,
      state.capitalInvestments,
      state.investorDistributions,
      state.nav,
      state.capitalActivities,
      state.distributionTable,
      state.irr,
      this.kpiCards(),
      this.periodLabel(),
    );
  });

  constructor() {
    this.transactionSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => a.blockId === b.blockId && a.search === b.search),
        takeUntilDestroyed(),
      )
      .subscribe(({ blockId, search }) => {
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

    const navigationState = (history.state ?? {}) as { investorRow?: InvestorTableRow };
    if (navigationState.investorRow) {
      this.listRow.set(navigationState.investorRow);
    }

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(InvestorsApiActions.clearDetail());
    });

    effect(() => {
      const view = this.timeframe();
      const investorKey = this.investorKey();
      if (investorKey == null) {
        return;
      }
      if (view === 'quarterly' && this.dateKey() == null) {
        return;
      }
      this.loadSectionData(investorKey, view);
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

    effect(() => {
      if (!this.filterReloading()) {
        return;
      }

      const state = this.detailState();
      const sectionLoading =
        state.commitmentsLoading ||
        state.unfundedCommitmentsLoading ||
        state.capitalInvestmentsLoading ||
        state.investorDistributionsLoading ||
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
    });
  }

  setTimeframe(view: DetailTimeframe): void {
    this.timeframe.set(view);
    if (view === 'quarterly') {
      this.ensureQuarterlySelection(this.filterOptions());
    }
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
    this.transactionSearch$.next(event);
  }

  onTransactionSort(event: { blockId: string; sortBy: string; defaultDir: TransactionTableSortDir }): void {
    const current = this.transactionSort()[event.blockId];
    const nextDir: TransactionTableSortDir =
      current?.sortBy === event.sortBy
        ? current.sortDir === 'asc'
          ? 'desc'
          : 'asc'
        : event.defaultDir;

    this.transactionSort.update((state) => ({
      ...state,
      [event.blockId]: { sortBy: event.sortBy, sortDir: nextDir },
    }));

    if (this.isServerSortedTable(event.blockId)) {
      this.reloadTransactionTable(event.blockId);
    }
  }

  private isServerSortedTable(blockId: string): boolean {
    return blockId === 'capital-activities' || blockId === 'distributions' || blockId === 'irrs';
  }

  tableSortColumnForBlock(block: InvestorDetailBlock): string | null {
    if (block.kind !== 'table' || !this.hasSortableColumns(block)) {
      return null;
    }
    return this.transactionSort()[block.id]?.sortBy ?? null;
  }

  tableSortDirForBlock(block: InvestorDetailBlock): TransactionTableSortDir {
    if (block.kind !== 'table' || !this.hasSortableColumns(block)) {
      return 'desc';
    }
    return this.transactionSort()[block.id]?.sortDir ?? 'desc';
  }

  private hasSortableColumns(block: InvestorDetailBlock): boolean {
    return block.kind === 'table' && block.columns.some((column) => !!column.sortBy);
  }

  tableLoadingForBlock(block: InvestorDetailBlock): boolean {
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
    this.activeSectionId.set(sectionId as InvestorDetailSectionId);

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
            this.getStickyScrollOffset() + InvestorDetailComponent.SECTION_SCROLL_GAP_PX;
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
    const readNullableAmount = (key: string): number | null => {
      const value = row[key];
      return typeof value === 'number' && Number.isFinite(value) ? value : null;
    };

    const investorKey = this.investorKey();
    if (investorKey == null || investorKey <= 0) {
      return;
    }

    const investment = this.detailState().investments.find((item) => item.fundKey === fundKey);
    const fundCodeRecord = investment as (typeof investment & Record<string, unknown>) | undefined;
    let fundCode: string | null = null;
    if (fundCodeRecord) {
      for (const key of ['fund_code', 'fundCode', 'FundCode']) {
        const value = fundCodeRecord[key];
        if (typeof value === 'string' && value.trim()) {
          fundCode = value.trim();
          break;
        }
      }
    }

    void this.router.navigate(['/capital-dashboard/investor', investorKey, 'fund', fundKey], {
      state: {
        fundRow: fundTableRowFromFundExposure({
          fundKey,
          fundName,
          commitment: readAmount('commitment'),
          netInvestedCapital: readAmount('netInvestedCapital'),
          netDistributed: readAmount('netDistributed'),
          reservedUncalled: readAmount('reserved'),
          releasedCapital: readNullableAmount('releasedCapital'),
          index: event.rowIndex,
        }),
        investorRow: this.listRow(),
        fundCode,
      },
    });
  }

  backToList(): void {
    void this.router.navigate(['/capital-dashboard/investor']);
  }

  private loadInvestorData(investorKey: number): void {
    this.store.dispatch(InvestorsApiActions.loadDetail({ investorKey }));
    this.loadSectionData(investorKey, this.timeframe());
  }

  private loadSectionData(investorKey: number, timeframe: DetailTimeframe): void {
    this.filterReloading.set(true);
    const request = this.buildTablePageRequest(investorKey, timeframe);

    this.store.dispatch(InvestorsApiActions.loadInvestorCommitmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorUnfundedCommitmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorCapitalInvestmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorDistributionsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorNavPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorCapitalActivitiesPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorDistributionTablePage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorIrrPage(request));
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
    }
  }

  private buildTablePageRequest(
    investorKey: number,
    timeframe: DetailTimeframe,
    search = '',
  ) {
    return {
      investorKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
    };
  }

  private buildTransactionTableRequest(
    investorKey: number,
    timeframe: DetailTimeframe,
    blockId: string,
    search = '',
  ) {
    const sort = untracked(() => this.transactionSort()[blockId]);
    return {
      investorKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
      ...(sort?.sortBy ? { sortBy: sort.sortBy, sortDir: sort.sortDir } : {}),
    };
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
