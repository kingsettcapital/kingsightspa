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
import { InvestorTableRow } from '../../shared/utils/investor-list-row.util';
import { InvestorsApiActions } from '../../store';
import { selectInvestorsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { INVESTOR_DETAIL_SIDEBAR_SECTIONS } from './models/investor-detail-sidebar.config';
import { InvestorDetailSidebarComponent } from './investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from './investor-detail-block/investor-detail-block.component';
import {
  buildFlatInvestorBlocks,
  InvestorDetailSectionId,
  kpiCardsFromListRow,
} from './utils/investor-detail-tables.util';

type DetailTimeframe = 'ltd' | 'quarterly' | 'daily';

@Component({
  selector: 'app-investor-detail',
  standalone: true,
  imports: [
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

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');

  readonly sidebarSections = INVESTOR_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<InvestorDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly timeframe = signal<DetailTimeframe>('ltd');

  readonly investorKey = signal<number | null>(null);
  readonly listRow = signal<InvestorTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectInvestorsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly error = computed(() => this.detailState().error);
  readonly detail = computed(() => this.detailState().detail);

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
    switch (this.timeframe()) {
      case 'quarterly':
        return 'Quarterly';
      case 'daily':
        return 'Daily';
      default:
        return 'LTD';
    }
  });

  readonly kpiCards = computed(() => kpiCardsFromListRow(this.listRow()));

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
      this.kpiCards(),
      this.periodLabel(),
    );
  });

  constructor() {
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
      this.loadSectionData(investorKey, view);
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

  setTimeframe(view: DetailTimeframe): void {
    this.timeframe.set(view);
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
          const top = main.scrollTop + (targetRect.top - mainRect.top);
          main.scrollTo({ top, behavior: 'smooth' });
        }
      }

      window.setTimeout(() => this.scrollSpyPaused.set(false), 800);
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
    const request = {
      investorKey,
      timeframe,
      page: 1,
      search: '',
      replace: true,
    };

    this.store.dispatch(InvestorsApiActions.loadInvestorCommitmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorUnfundedCommitmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorCapitalInvestmentsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorDistributionsPage(request));
    this.store.dispatch(InvestorsApiActions.loadInvestorNavPage(request));
  }
}
