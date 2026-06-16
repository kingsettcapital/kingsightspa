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
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { map } from 'rxjs';

import { KsCurrencyPipe } from '../../../../shared/pipes/ks-currency.pipe';
import { FundTableRow } from '../../shared/utils/fund-list-row.util';
import { InvestorDetailSidebarComponent } from '../../investors/investor-detail/investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from '../../investors/investor-detail/investor-detail-block/investor-detail-block.component';
import { FundsApiActions } from '../../store';
import { selectFundsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { INVESTMENT_DETAIL_SIDEBAR_SECTIONS } from './models/investment-detail-sidebar.config';
import {
  buildFlatInvestmentBlocks,
  InvestmentDetailSectionId,
  InvestmentDetailTimeframe,
  kpiCardsFromListRow,
} from './utils/investment-detail-tables.util';
import { INVESTMENT_DETAIL_DUMMY } from './data/investment-detail-dummy.data';

@Component({
  selector: 'app-investment-detail',
  standalone: true,
  imports: [
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

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');

  readonly sidebarSections = INVESTMENT_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestmentDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<InvestmentDetailTimeframe>('ltd');

  readonly fundKey = signal<number | null>(null);
  readonly listRow = signal<FundTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectFundsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly error = computed(() => this.detailState().error);
  readonly detail = computed(() => this.detailState().detail);

  readonly fundName = computed(
    () =>
      this.listRow()?.name ??
      this.detail()?.summary.fundName ??
      INVESTMENT_DETAIL_DUMMY.fundName,
  );

  readonly fundType = computed(
    () =>
      this.listRow()?.fundType ??
      this.detail()?.summary.fundType ??
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
    const fundId = this.detail()?.summary.fundId ?? INVESTMENT_DETAIL_DUMMY.fundId;
    const pct = this.investedPercent();
    const pctLabel = pct != null ? `${pct.toFixed(1)}% Invested` : '';
    return [status, `Fund ID: ${fundId}`, pctLabel].filter(Boolean).join(' · ');
  });

  readonly periodLabel = computed(() => {
    switch (this.timeframe()) {
      case 'quarterly':
        return 'Quarterly';
      case 'daily':
        return 'Daily';
      default:
        return 'LTD';
    }
  });

  readonly netInvestedHint = computed(() => {
    if (this.timeframe() === 'daily') {
      return 'LTD-adjusted';
    }
    if (this.timeframe() === 'quarterly') {
      return 'LTD deployed';
    }
    return 'LTD deployed';
  });

  readonly reservedHint = computed(() =>
    this.timeframe() === 'daily' ? 'Unfunded' : 'Uncalled',
  );

  readonly kpiCards = computed(() => kpiCardsFromListRow(this.listRow(), this.timeframe()));

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    return buildFlatInvestmentBlocks(
      state.detail,
      state.assets,
      state.commitments,
      state.unfundedCommitments,
      state.fundInvestments,
      state.fundDistributions,
      this.kpiCards(),
      this.timeframe(),
    );
  });

  constructor() {
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

    const navigationState = (history.state ?? {}) as { fundRow?: FundTableRow };
    if (navigationState.fundRow) {
      this.listRow.set(navigationState.fundRow);
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
      this.loadSectionData(fundKey, view);
    });

    effect((onCleanup) => {
      if (this.loading()) {
        return;
      }

      this.flatBlocks();

      const main = this.mainContentRef()?.nativeElement;
      if (!main) {
        return;
      }

      let detachSpy: (() => void) | undefined;
      const frame = requestAnimationFrame(() => {
        detachSpy = bindDetailSectionScrollSpy({
          main,
          sectionIds: flattenSidebarSectionIds(this.sidebarSections),
          activeSectionId: this.activeSectionId,
          isPaused: () => this.scrollSpyPaused(),
        });
      });

      onCleanup(() => {
        cancelAnimationFrame(frame);
        detachSpy?.();
      });
    });
  }

  setTimeframe(view: InvestmentDetailTimeframe): void {
    this.timeframe.set(view);
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
          const top = main.scrollTop + (targetRect.top - mainRect.top);
          main.scrollTo({ top, behavior: 'smooth' });
        }
      }

      window.setTimeout(() => this.scrollSpyPaused.set(false), 800);
    });
  }

  backToList(): void {
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
    const request = {
      fundKey,
      timeframe,
      page: 1,
      search: '',
      replace: true,
    };

    this.store.dispatch(FundsApiActions.loadFundCommitmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundUnfundedCommitmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundInvestmentsPage(request));
    this.store.dispatch(FundsApiActions.loadFundDistributionsPage(request));
    this.store.dispatch(FundsApiActions.loadFundNavPage(request));
    this.store.dispatch(FundsApiActions.loadFundAssetsPage({ fundKey, page: 1, search: '' }));
    this.store.dispatch(FundsApiActions.loadFundInvestorsPage({ fundKey, page: 1, search: '' }));
  }
}
