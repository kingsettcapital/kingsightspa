import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
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
import { FundTableRow } from '../../shared/utils/fund-list-row.util';
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import {
  EMPTY_INVESTORS_FILTER_OPTIONS,
  InvestorsFilterOptions,
  normalizeInvestorsFilterOptions,
} from '../../shared/utils/investor-filter-options.util';
import { InvestorDetailSidebarComponent } from '../investor-detail/investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from '../investor-detail/investor-detail-block/investor-detail-block.component';
import { FundsApiActions, InvestorsApiActions } from '../../store';
import { selectFundsDetail, selectInvestorsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { INVESTMENT_DETAIL_DUMMY } from '../../investments/investment-detail/data/investment-detail-dummy.data';
import {
  InvestmentDetailTimeframe,
  kpiCardsFromListRow,
} from '../../investments/investment-detail/utils/investment-detail-tables.util';
import { INVESTOR_FUND_DETAIL_SIDEBAR_SECTIONS } from './models/investor-fund-detail-sidebar.config';
import {
  buildFlatInvestorFundBlocks,
  filterCapitalActivitiesByFund,
  filterDistributionTableByFund,
  filterIrrByFund,
  InvestorFundDetailSectionId,
  InvestorFundMatchContext,
} from './utils/investor-fund-detail-tables.util';

@Component({
  selector: 'app-investor-fund-detail',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    MatIconModule,
    KsCurrencyPipe,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  templateUrl: './investor-fund-detail.component.html',
  styleUrl: '../investor-detail/investor-detail.component.scss',
})
export class InvestorFundDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly investorsApi = inject(CapitalInvestorsApiService);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly stickyChromeRef = viewChild<ElementRef<HTMLElement>>('stickyChrome');

  private static readonly SECTION_SCROLL_GAP_PX = 8;

  readonly sidebarSections = INVESTOR_FUND_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestorFundDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<InvestmentDetailTimeframe>('ltd');
  readonly quarter = signal<number | null>(null);
  readonly year = signal<number | null>(null);
  readonly filterOptions = signal<InvestorsFilterOptions>(EMPTY_INVESTORS_FILTER_OPTIONS);

  readonly investorKey = signal<number | null>(null);
  readonly fundKey = signal<number | null>(null);
  readonly fundCode = signal<string | null>(null);
  readonly listRow = signal<FundTableRow | null>(null);
  readonly investorRow = signal<InvestorTableRow | null>(null);

  private readonly investorDetailState = this.store.selectSignal(selectInvestorsDetail);
  private readonly fundDetailState = this.store.selectSignal(selectFundsDetail);

  readonly loading = computed(
    () => this.investorDetailState().loading || this.fundDetailState().loading,
  );
  readonly error = computed(() => {
    if (this.listRow()) {
      return null;
    }
    return this.investorDetailState().error ?? this.fundDetailState().error;
  });
  readonly fundDetail = computed(() => this.fundDetailState().detail);

  private readonly filterReloading = signal(false);

  readonly contentLoading = computed(() => {
    if (this.listRow()) {
      const fundMetaPending = this.fundDetailState().loading && !this.fundDetailState().detail;
      return fundMetaPending || this.filterReloading();
    }
    return this.loading() || this.filterReloading();
  });
  readonly contentLoadingMessage = computed(() =>
    this.loading() ? 'Loading subscription profile…' : 'Loading data…',
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
    () => this.investorRow()?.name ?? this.investorDetailState().detail?.summary.investorName ?? 'Investor',
  );

  readonly fundName = computed(
    () =>
      this.listRow()?.name ??
      this.fundDetail()?.summary.fundName ??
      INVESTMENT_DETAIL_DUMMY.fundName,
  );

  readonly fundType = computed(
    () =>
      this.listRow()?.fundType ??
      this.fundDetail()?.summary.fundType ??
      INVESTMENT_DETAIL_DUMMY.fundType,
  );

  readonly strategyLabel = computed(() => this.listRow()?.strategy ?? this.fundType());

  readonly investedPercent = computed(() => {
    const row = this.listRow();
    if (row?.investedPercent != null) {
      return row.investedPercent;
    }
    return INVESTMENT_DETAIL_DUMMY.investedPercent;
  });

  readonly subtitleText = computed(() => {
    const status = INVESTMENT_DETAIL_DUMMY.listingStatus;
    const fundId = this.fundDetail()?.summary.fundId ?? INVESTMENT_DETAIL_DUMMY.fundId;
    const pct = this.investedPercent();
    const pctLabel = pct != null ? `${pct.toFixed(1)}% Invested` : '';
    return [this.investorName(), status, `Fund ID: ${fundId}`, pctLabel].filter(Boolean).join(' · ');
  });

  readonly backLinkLabel = computed(() => {
    const name = this.investorName()?.trim();
    return name ? `Back to ${name}` : 'Back to Investor';
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

  readonly netInvestedHint = computed(() =>
    this.timeframe() === 'daily' ? 'ITD-adjusted' : 'ITD deployed',
  );

  readonly reservedHint = computed(() =>
    this.timeframe() === 'daily' ? 'Unfunded' : 'Uncalled',
  );

  readonly kpiCards = computed(() => kpiCardsFromListRow(this.listRow(), this.timeframe()));

  readonly fundMatchContext = computed((): InvestorFundMatchContext | null => {
    const fundKey = this.fundKey();
    if (fundKey == null) {
      return null;
    }
    return {
      fundKey,
      fundCode: this.fundCode(),
      fundName: this.fundName(),
    };
  });

  readonly flatBlocks = computed(() => {
    const context = this.fundMatchContext();
    if (!context) {
      return [];
    }

    const investorState = this.investorDetailState();
    const fundState = this.fundDetailState();
    const capitalActivities = filterCapitalActivitiesByFund(investorState.capitalActivities, context);
    const distributionTable = filterDistributionTableByFund(investorState.distributionTable, context);
    const irr = filterIrrByFund(investorState.irr, context);
    const releasedCapital = this.listRow()?.releasedCapital ?? null;

    return buildFlatInvestorFundBlocks(
      fundState.detail,
      fundState.assets,
      capitalActivities,
      distributionTable,
      irr,
      this.kpiCards(),
      this.timeframe(),
      this.periodLabel(),
      releasedCapital,
    );
  });

  constructor() {
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
        map((params) => ({
          investorKey: Number(params.get('investorKey')),
          fundKey: Number(params.get('fundKey')),
        })),
        takeUntilDestroyed(),
      )
      .subscribe(({ investorKey, fundKey }) => {
        if (
          !Number.isFinite(investorKey) ||
          investorKey <= 0 ||
          !Number.isFinite(fundKey) ||
          fundKey <= 0
        ) {
          void this.router.navigate(['/capital-dashboard/investor']);
          return;
        }

        this.investorKey.set(investorKey);
        this.fundKey.set(fundKey);
        this.loadPageData(investorKey, fundKey);
      });

    const navigationState = (history.state ?? {}) as {
      fundRow?: FundTableRow;
      investorRow?: InvestorTableRow;
      fundCode?: string | null;
    };
    if (navigationState.fundRow) {
      this.listRow.set(navigationState.fundRow);
    }
    if (navigationState.investorRow) {
      this.investorRow.set(navigationState.investorRow);
    }
    if (navigationState.fundCode?.trim()) {
      this.fundCode.set(navigationState.fundCode.trim());
    }

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(FundsApiActions.clearDetail());
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
      this.loadInvestorSectionData(investorKey, view);
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
            this.getStickyScrollOffset() + InvestorFundDetailComponent.SECTION_SCROLL_GAP_PX,
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

      const state = this.investorDetailState();
      const sectionLoading =
        state.capitalActivitiesLoading ||
        state.distributionTableLoading ||
        state.irrLoading;

      if (!sectionLoading) {
        this.filterReloading.set(false);
      }
    });
  }

  setTimeframe(view: InvestmentDetailTimeframe): void {
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

  scrollToSection(sectionId: string): void {
    this.scrollSpyPaused.set(true);
    this.activeSectionId.set(sectionId as InvestorFundDetailSectionId);

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
            this.getStickyScrollOffset() + InvestorFundDetailComponent.SECTION_SCROLL_GAP_PX;
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

  backToInvestor(): void {
    const investorKey = this.investorKey();
    if (investorKey == null) {
      void this.router.navigate(['/capital-dashboard/investor']);
      return;
    }

    void this.router.navigate(['/capital-dashboard/investor', investorKey], {
      state: this.investorRow() ? { investorRow: this.investorRow() } : undefined,
    });
  }

  formatInvestedPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatTvpi(value: number): string {
    return `${value.toFixed(2)}x`;
  }

  private loadPageData(investorKey: number, fundKey: number): void {
    this.store.dispatch(InvestorsApiActions.loadDetail({ investorKey }));
    this.store.dispatch(FundsApiActions.loadDetail({ fundKey }));
    this.store.dispatch(FundsApiActions.loadFundAssetsPage({ fundKey, page: 1, search: '' }));
    this.loadInvestorSectionData(investorKey, this.timeframe());
  }

  private loadInvestorSectionData(investorKey: number, timeframe: InvestmentDetailTimeframe): void {
    this.filterReloading.set(true);
    const request = this.buildTablePageRequest(investorKey, timeframe);

    this.store.dispatch(InvestorsApiActions.loadInvestorCapitalActivitiesPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorDistributionTablePage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorIrrPage(request));
  }

  private buildTablePageRequest(investorKey: number, timeframe: InvestmentDetailTimeframe, search = '') {
    return {
      investorKey,
      timeframe,
      page: 1,
      search,
      replace: true,
      ...(timeframe === 'quarterly' && this.dateKey() != null ? { dateKey: this.dateKey()! } : {}),
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
