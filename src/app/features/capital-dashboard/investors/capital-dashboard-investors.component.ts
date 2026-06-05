import {

  Component,

  computed,

  effect,

  ElementRef,

  inject,

  signal,

  viewChild,

} from '@angular/core';

import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { Store } from '@ngrx/store';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';

import { MatChipsModule } from '@angular/material/chips';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatIconModule } from '@angular/material/icon';

import { MatInputModule } from '@angular/material/input';

import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MatTableModule } from '@angular/material/table';

import { MatTabsModule } from '@angular/material/tabs';

import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';



import { InvestorsApiActions } from '../store';

import { extractPagedItems } from '../store/capital-dashboard-cache.util';

import { selectInvestorsDetail, selectInvestorsList } from '../store/capital-dashboard.selectors';

import { ListInfiniteScrollDirective } from '../shared/list-infinite-scroll.directive';

import { DetailStatusBadgeComponent } from '../shared/components/detail-status-badge/detail-status-badge.component';

import { OverviewSectionCardsComponent } from '../shared/components/overview-section-cards/overview-section-cards.component';

import { PortalSpinnerComponent } from '../shared/components/portal-spinner/portal-spinner.component';

import { InvestorListItemDto } from '../shared/models/api.models';

import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';

import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';

import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';

import { shouldRequestDetail } from '../shared/utils/should-request-detail.util';

import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';

import { InvestorCommitmentsTabComponent } from './tabs/commitments/investor-commitments-tab.component';

import { InvestorUnfundedCommitmentTabComponent } from './tabs/unfunded-commitment/investor-unfunded-commitment-tab.component';

import { InvestorCapitalInvestmentsTabComponent } from './tabs/investments/investor-capital-investments-tab.component';

import { InvestorDistributionsTabComponent } from './tabs/distributions/investor-distributions-tab.component';

import { InvestorNavTabComponent } from './tabs/nav/investor-nav-tab.component';



@Component({

  selector: 'app-capital-dashboard-investors',

  standalone: true,

  imports: [

    FormsModule,

    MatButtonModule,

    MatChipsModule,

    MatFormFieldModule,

    MatIconModule,

    MatInputModule,

    MatProgressBarModule,

    MatTableModule,

    MatTabsModule,

    ListInfiniteScrollDirective,


    DetailStatusBadgeComponent,

    OverviewSectionCardsComponent,

    PortalSpinnerComponent,

    KsCurrencyPipe,

    InvestorCommitmentsTabComponent,

    InvestorUnfundedCommitmentTabComponent,

    InvestorCapitalInvestmentsTabComponent,

    InvestorDistributionsTabComponent,

    InvestorNavTabComponent,

  ],

  templateUrl: './capital-dashboard-investors.component.html',

  styleUrl: './capital-dashboard-investors.component.scss',

})

export class CapitalDashboardInvestorsComponent {

  private readonly store = inject(Store);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);



  private readonly investorsListState = this.store.selectSignal(selectInvestorsList);

  private readonly investorsDetailState = this.store.selectSignal(selectInvestorsDetail);



  readonly formatCurrency = formatCurrency;

  readonly formatPercent = formatPercent;

  readonly overviewCards = computed(() =>

    sectionCardsFromSections(this.investorDetail()?.sections ?? null),

  );



  readonly searchQuery = signal('');

  readonly fundsSearchQuery = signal('');

  readonly investors = computed(() => extractPagedItems(this.investorsListState().items));

  readonly listLoading = computed(() => this.investorsListState().loading);

  readonly listLoadingMore = computed(() => this.investorsListState().loadingMore);

  readonly listError = computed(() => this.investorsListState().error);

  readonly totalCount = computed(() => this.investorsListState().totalCount);

  readonly hasNextPage = computed(() => this.investorsListState().hasNextPage);



  readonly selectedInvestorKey = computed(() => this.investorsDetailState().selectedKey);

  readonly investorDetail = computed(() => this.investorsDetailState().detail);

  readonly investorInvestments = computed(() => this.investorsDetailState().investments);

  readonly investorFundsLoading = computed(() => this.investorsDetailState().investmentsLoading);

  readonly investorFundsLoadingMore = computed(() => this.investorsDetailState().investmentsLoadingMore);

  readonly investorFundsHasNextPage = computed(() => this.investorsDetailState().investmentsHasNextPage);

  readonly detailLoading = computed(() => this.investorsDetailState().loading);

  readonly detailError = computed(() => this.investorsDetailState().error);



  readonly activeTabIndex = signal(0);

  /** Overview=0, Commitments=1, Unfunded=2, Investments=3, Distributions=4, NAV=5 */

  readonly commitmentsTabIndex = 1;

  readonly unfundedCommitmentsTabIndex = 2;

  readonly capitalInvestmentsTabIndex = 3;

  readonly distributionsTabIndex = 4;

  readonly navTabIndex = 5;



  readonly listColumns = ['investor', 'invested'];

  readonly fundColumns = ['name', 'type', 'status', 'value', 'return'];



  readonly selectedInvestor = computed(() => this.investorDetail());



  private pendingScrollKey: number | null = null;

  private pendingSelectName: string | null = null;

  private pendingAutoOpenFirst = false;

  private loadingMoreForScroll = false;



  private readonly listScrollContainer = viewChild<ElementRef<HTMLElement>>('listScrollContainer');

  private readonly loadDetail$ = new Subject<number>();



  constructor() {

    this.route.queryParamMap

      .pipe(takeUntilDestroyed())

      .subscribe((params) => {

        const detailTab = params.get('detailTab');

        if (
          detailTab === 'funds' ||
          detailTab === 'investments' ||
          detailTab === 'capital-investments'
        ) {
          this.activeTabIndex.set(this.capitalInvestmentsTabIndex);
        }

        if (detailTab === 'commitments') this.activeTabIndex.set(this.commitmentsTabIndex);

        if (detailTab === 'unfunded') this.activeTabIndex.set(this.unfundedCommitmentsTabIndex);

        if (detailTab === 'distributions') this.activeTabIndex.set(this.distributionsTabIndex);

        if (detailTab === 'nav') this.activeTabIndex.set(this.navTabIndex);

        if (detailTab === 'overview') this.activeTabIndex.set(0);



        const selectedRaw = params.get('selected');

        const selectedParsed = selectedRaw ? Number(selectedRaw) : NaN;

        this.pendingScrollKey = Number.isFinite(selectedParsed) ? selectedParsed : null;



        const search = (params.get('search') ?? '').trim();

        this.pendingSelectName = search || null;

        this.pendingAutoOpenFirst = !!search;

        if (search && this.searchQuery() !== search) {

          this.searchQuery.set(search);

        }

      });



    toObservable(this.searchQuery)

      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())

      .subscribe((search) => {

        this.pendingScrollKey = this.pendingScrollKey ?? this.selectedIdFromRoute();

        this.store.dispatch(InvestorsApiActions.loadList({ search, page: 1, replace: true }));

      });



    toObservable(this.fundsSearchQuery)

      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())

      .subscribe((search) => {

        const investorKey = this.investorsDetailState().selectedKey;

        if (!investorKey) return;

        this.store.dispatch(

          InvestorsApiActions.loadInvestorFundsPage({

            investorKey,

            page: 1,

            search,

          }),

        );

      });



    const initialSelected = this.selectedIdFromRoute();

    if (initialSelected != null) {

      this.pendingScrollKey = initialSelected;

    }



    this.loadDetail$.pipe(takeUntilDestroyed()).subscribe((investorKey) => {

      this.activeTabIndex.set(0);

      this.fundsSearchQuery.set('');

      this.store.dispatch(InvestorsApiActions.loadDetail({ investorKey }));

    });



    effect(() => {

      const list = this.investorsListState();

      if (!list.loading && !list.loadingMore) {

        this.ensureSelectedInListAndScroll();

      }

    });



    effect(() => {
      const detail = this.investorsDetailState();

      if (!detail.loading && detail.detail) {
        this.cleanupDeepLinkQueryParams();
      }
    });
  }



  onDetailTabIndexChange(index: number): void {

    this.activeTabIndex.set(index);

  }



  private loadInvestorFundsPageIfNeeded(): void {

    const investorKey = this.selectedInvestorKey();

    if (!investorKey || this.detailLoading()) return;



    const detail = this.investorsDetailState();

    const search = this.fundsSearchQuery().trim();

    if (detail.investmentsLoading || detail.investmentsLoadingMore) return;

    if (

      detail.investments.length > 0 &&

      detail.investmentsSearch.trim() === search

    ) {

      return;

    }



    this.store.dispatch(

      InvestorsApiActions.loadInvestorFundsPage({

        investorKey,

        page: 1,

        search,

      }),

    );

  }



  loadMoreInvestorFunds(): void {

    const detail = this.investorsDetailState();

    if (detail.investmentsLoading || detail.investmentsLoadingMore || !detail.investmentsHasNextPage) {

      return;

    }

    const investorKey = detail.selectedKey;

    if (!investorKey) return;



    this.store.dispatch(

      InvestorsApiActions.loadInvestorFundsPage({

        investorKey,

        page: detail.investmentsPage + 1,

        search: detail.investmentsSearch,

      }),

    );

  }



  clearFundsSearch(): void {

    this.fundsSearchQuery.set('');

  }



  private cleanupDeepLinkQueryParams(): void {

    const params = this.route.snapshot.queryParamMap;

    const hasDeepLinkParams = params.has('selected') || params.has('search') || params.has('detailTab');

    if (!hasDeepLinkParams) return;



    void this.router.navigate([], {

      relativeTo: this.route,

      queryParams: {

        selected: null,

        search: null,

        detailTab: null,

      },

      queryParamsHandling: 'merge',

      replaceUrl: true,

    });

  }



  loadMore(): void {

    this.store.dispatch(InvestorsApiActions.loadListMore());

  }



  selectInvestor(investor: InvestorListItemDto): void {

    this.requestDetail(investor.investorKey);

  }



  clearSelection(): void {

    this.store.dispatch(InvestorsApiActions.clearDetail());

    this.activeTabIndex.set(0);

  }



  investorIcon(type: string | null | undefined): string {

    switch (type) {

      case 'Institution':

        return 'business';

      case 'Family Office':

      case 'Trust':

        return 'account_balance';

      default:

        return 'person';

    }

  }



  private summaryValueRaw(key: string): unknown | null {

    const summary = this.investorDetail()?.summary;

    if (!summary) return null;

    const record = summary as unknown as Record<string, unknown>;

    return record[key] ?? null;

  }



  summaryDisplay(key: string): string {

    const raw = this.summaryValueRaw(key);

    if (raw == null) return '—';

    if (typeof raw === 'string') return raw.trim() || '—';

    if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);

    return String(raw).trim() || '—';

  }



  summaryMoney(key: string): string {

    const raw = this.summaryValueRaw(key);

    if (typeof raw === 'number' && Number.isFinite(raw)) return formatCurrency(raw);

    if (typeof raw === 'string') {

      const parsed = Number(raw.trim());

      if (Number.isFinite(parsed)) return formatCurrency(parsed);

      return raw.trim() || '—';

    }

    return '—';

  }



  summaryNumber(key: string): number {

    const raw = this.summaryValueRaw(key);

    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;

    if (typeof raw === 'string') {

      const parsed = Number(raw.trim());

      if (Number.isFinite(parsed)) return parsed;

    }

    return 0;

  }



  joinDateDisplay(): string {

    const year = this.summaryNumber('joinYear');

    if (year > 0) return String(year);

    return '—';

  }



  goToInvestment(fundKey: number, fundName: string | null | undefined): void {

    void this.router.navigate(['../investment'], {

      relativeTo: this.route,

      queryParams: {

        selected: fundKey,

        search: fundName?.trim() || undefined,

        detailTab: 'overview',

      },

      queryParamsHandling: 'merge',

      replaceUrl: true,

    });

  }



  private readonly selectedIdFromRoute = () => {

    const value = this.route.snapshot.queryParamMap.get('selected');

    if (!value) return null;

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;

  };



  private ensureSelectedInListAndScroll(): void {

    let key = this.pendingScrollKey ?? this.selectedInvestorKey();

    if (key == null && this.pendingSelectName) {

      key = this.matchInvestorKeyByName(this.pendingSelectName);

      if (key != null) this.pendingScrollKey = key;

    }

    if (key == null) {

      if (this.pendingAutoOpenFirst) {

        const first = this.investors()[0] ?? null;

        if (first) {

          this.pendingAutoOpenFirst = false;

          this.pendingScrollKey = first.investorKey;

          this.requestDetail(first.investorKey);

          this.scrollToSelected(first.investorKey);

        }

      }

      return;

    }



    if (this.investors().some((investor) => investor.investorKey === key)) {

      this.requestDetail(key);

      this.scrollToSelected(key);

      return;

    }



    if (!this.hasNextPage() && this.pendingSelectName) {

      const byName = this.matchInvestorKeyByName(this.pendingSelectName);

      if (byName != null && byName !== key) {

        this.pendingScrollKey = byName;

        this.requestDetail(byName);

        this.scrollToSelected(byName);

        return;

      }

    }



    if (!this.hasNextPage() && this.pendingAutoOpenFirst) {

      const first = this.investors()[0] ?? null;

      if (first) {

        this.pendingAutoOpenFirst = false;

        this.pendingScrollKey = first.investorKey;

        this.requestDetail(first.investorKey);

        this.scrollToSelected(first.investorKey);

        return;

      }

    }



    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {

      this.loadingMoreForScroll = true;

      this.store.dispatch(InvestorsApiActions.loadListMore());

      queueMicrotask(() => {

        this.loadingMoreForScroll = false;

      });

    }

  }



  private matchInvestorKeyByName(name: string): number | null {

    const needle = name.trim().toLowerCase();

    if (!needle) return null;



    const matches = this.investors().filter((inv) => {

      const hay = (inv.investorName ?? '').trim().toLowerCase();

      return hay === needle || hay.includes(needle);

    });



    if (matches.length === 1) return matches[0].investorKey;

    return null;

  }



  private requestDetail(investorKey: number): void {

    const detail = this.investorsDetailState();

    if (

      !shouldRequestDetail(

        detail.selectedKey,

        detail.loading,

        detail.detail != null,

        investorKey,

      )

    ) {

      return;

    }

    this.loadDetail$.next(investorKey);

  }



  private scrollToSelected(key: number): void {

    const rowIndex = this.investors().findIndex((investor) => investor.investorKey === key);

    scrollListItemIntoView(() => this.listScrollContainer()?.nativeElement, key, {

      rowIndex,

      onSuccess: () => {

        this.pendingScrollKey = null;

      },

    });

  }

}


