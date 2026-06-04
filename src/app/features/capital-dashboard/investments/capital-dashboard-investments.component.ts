import { DecimalPipe } from '@angular/common';
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
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { FundsApiActions } from '../store';
import { extractPagedItems } from '../store/capital-dashboard-cache.util';
import { selectFundsDetail, selectFundsList } from '../store/capital-dashboard.selectors';
import { ListInfiniteScrollDirective } from '../shared/list-infinite-scroll.directive';
import { DetailStatusBadgeComponent } from '../shared/components/detail-status-badge/detail-status-badge.component';
import { OverviewSectionCardsComponent } from '../shared/components/overview-section-cards/overview-section-cards.component';
import { PortalSpinnerComponent } from '../shared/components/portal-spinner/portal-spinner.component';
import { FundAssetTabRow, FundListItemDto } from '../shared/models/api.models';
import { FundInvestorTabRow } from './tabs/fund-investor.mapper';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';
import { shouldRequestDetail } from '../shared/utils/should-request-detail.util';
import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { InvestmentCommitmentsTabComponent } from './tabs/commitments/investment-commitments-tab.component';
import { InvestmentUnfundedCommitmentTabComponent } from './tabs/unfunded-commitment/investment-unfunded-commitment-tab.component';
import { InvestmentInvestmentsTabComponent } from './tabs/investments/investment-investments-tab.component';
import { InvestmentDistributionsTabComponent } from './tabs/distributions/investment-distributions-tab.component';
import { InvestmentNavTabComponent } from './tabs/nav/investment-nav-tab.component';

@Component({
  selector: 'app-capital-dashboard-investments',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTableModule,
    MatTabsModule,
    ListInfiniteScrollDirective,
    OverviewSectionCardsComponent,
    PortalSpinnerComponent,
    KsCurrencyPipe,
    InvestmentCommitmentsTabComponent,
    InvestmentUnfundedCommitmentTabComponent,
    InvestmentInvestmentsTabComponent,
    InvestmentDistributionsTabComponent,
    InvestmentNavTabComponent,
  ],
  templateUrl: './capital-dashboard-investments.component.html',
  styleUrl: './capital-dashboard-investments.component.scss',
})
export class CapitalDashboardInvestmentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  private readonly fundsListState = this.store.selectSignal(selectFundsList);
  private readonly fundsDetailState = this.store.selectSignal(selectFundsDetail);

  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly overviewCards = computed(() => sectionCardsFromSections(this.fundDetail()?.sections ?? null));

  readonly searchQuery = signal('');
  readonly funds = computed(() => extractPagedItems(this.fundsListState().items));
  readonly listLoading = computed(() => this.fundsListState().loading);
  readonly listLoadingMore = computed(() => this.fundsListState().loadingMore);
  readonly listError = computed(() => this.fundsListState().error);
  readonly totalCount = computed(() => this.fundsListState().totalCount);
  readonly hasNextPage = computed(() => this.fundsListState().hasNextPage);

  readonly selectedFundKey = computed(() => this.fundsDetailState().selectedKey);
  readonly fundDetail = computed(() => this.fundsDetailState().detail);
  readonly fundAssets = computed(() => this.fundsDetailState().assets);
  readonly assetSearchQuery = signal('');
  readonly investorSearchQuery = signal('');
  readonly fundAssetsLoading = computed(() => this.fundsDetailState().assetsLoading);
  readonly fundAssetsLoadingMore = computed(() => this.fundsDetailState().assetsLoadingMore);
  readonly fundAssetsHasNextPage = computed(() => this.fundsDetailState().assetsHasNextPage);
  readonly fundInvestors = computed(() => this.fundsDetailState().fundInvestors);
  readonly fundInvestorsLoading = computed(() => this.fundsDetailState().fundInvestorsLoading);
  readonly fundInvestorsLoadingMore = computed(() => this.fundsDetailState().fundInvestorsLoadingMore);
  readonly fundInvestorsHasNextPage = computed(() => this.fundsDetailState().fundInvestorsHasNextPage);
  readonly detailLoading = computed(() => this.fundsDetailState().loading);
  readonly detailError = computed(() => this.fundsDetailState().error);

  readonly activeTabIndex = signal(0);
  /** Overview=0, Assets=1, Investors=2, Commitments=3, Unfunded=4, Investments=5, Distributions=6, NAV=7 */
  readonly fundInvestorsTabIndex = 2;
  readonly fundAssetColumns = [
    'assetName',
    'city',
    'province',
    'geography',
    'assetType',
    'investmentType',
    'propertyStatus',
    'propertyAcquisition',
    'propertyDisposedDate',
  ];
  readonly fundInvestorColumns = [
    'investorName',
    'relationshipName',
    'investorTypeName',
    'contactFirstName',
    'contactLastName',
  ];
  readonly commitmentsTabIndex = 3;
  readonly unfundedCommitmentsTabIndex = 4;
  readonly fundInvestmentsTabIndex = 5;
  readonly fundDistributionsTabIndex = 6;
  readonly navTabIndex = 7;
  readonly listColumns = ['investment', 'value'];

  readonly selectedInvestment = computed(() => this.fundDetail());

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
        if (detailTab === 'periods' || detailTab === 'investors') {
          this.activeTabIndex.set(this.fundInvestorsTabIndex);
        }
        if (detailTab === 'assets') this.activeTabIndex.set(1);
        if (detailTab === 'overview') this.activeTabIndex.set(0);

        const selectedRaw = params.get('selected');
        const selectedParsed = selectedRaw ? Number(selectedRaw) : NaN;
        this.pendingScrollKey = Number.isFinite(selectedParsed) ? selectedParsed : null;

        const search = (params.get('search') ?? '').trim();
        this.pendingSelectName = search || null;
        // If we arrive via deep-link search, auto-open a result once the list loads.
        // This flag is cleared after the first successful auto-open.
        this.pendingAutoOpenFirst = !!search;
        if (search && this.searchQuery() !== search) {
          this.searchQuery.set(search);
        }
      });

    toObservable(this.searchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => {
        this.pendingScrollKey = this.pendingScrollKey ?? this.selectedIdFromRoute();
        this.store.dispatch(FundsApiActions.loadList({ search, page: 1, replace: true }));
      });

    toObservable(this.assetSearchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => {
        const fundKey = this.fundsDetailState().selectedKey;
        if (!fundKey) return;
        this.store.dispatch(
          FundsApiActions.loadFundAssetsPage({
            fundKey,
            page: 1,
            search,
          }),
        );
      });

    toObservable(this.investorSearchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => {
        const fundKey = this.fundsDetailState().selectedKey;
        if (!fundKey) return;
        this.store.dispatch(
          FundsApiActions.loadFundInvestorsPage({
            fundKey,
            page: 1,
            search,
          }),
        );
      });

    this.loadDetail$.pipe(takeUntilDestroyed()).subscribe((fundKey) => {
      this.activeTabIndex.set(0);
      this.store.dispatch(FundsApiActions.loadDetail({ fundKey }));
    });

    effect(() => {
      const list = this.fundsListState();
      if (!list.loading && !list.loadingMore) {
        this.ensureSelectedInListAndScroll();
      }
    });

    effect(() => {
      const detail = this.fundsDetailState();
      if (!detail.loading && detail.detail) {
        this.cleanupDeepLinkQueryParams();
      }
    });

    effect(() => {
      if (this.activeTabIndex() !== this.fundInvestorsTabIndex) return;
      // Read signals so this effect re-runs when fund selection or investor list state changes.
      this.selectedFundKey();
      this.detailLoading();
      this.fundInvestors();
      this.fundInvestorsLoading();
      this.investorSearchQuery();
      this.loadFundInvestorsPageIfNeeded();
    });
  }

  onDetailTabIndexChange(index: number): void {
    this.activeTabIndex.set(index);
  }

  private loadFundInvestorsPageIfNeeded(): void {
    const fundKey = this.selectedFundKey();
    if (!fundKey || this.detailLoading()) return;

    const detail = this.fundsDetailState();
    const search = this.investorSearchQuery().trim();
    if (detail.fundInvestorsLoading || detail.fundInvestorsLoadingMore) return;
    if (
      detail.fundInvestors.length > 0 &&
      detail.fundInvestorsSearch.trim() === search
    ) {
      return;
    }

    this.store.dispatch(
      FundsApiActions.loadFundInvestorsPage({
        fundKey,
        page: 1,
        search,
      }),
    );
  }

  loadMoreFundAssets(): void {
    const detail = this.fundsDetailState();
    if (detail.assetsLoading || detail.assetsLoadingMore || !detail.assetsHasNextPage) return;
    const fundKey = detail.selectedKey;
    if (!fundKey) return;

    this.store.dispatch(
      FundsApiActions.loadFundAssetsPage({
        fundKey,
        page: detail.assetsPage + 1,
        search: detail.assetsSearch,
      }),
    );
  }

  loadMoreFundInvestors(): void {
    const detail = this.fundsDetailState();
    if (detail.fundInvestorsLoading || detail.fundInvestorsLoadingMore || !detail.fundInvestorsHasNextPage) {
      return;
    }
    const fundKey = detail.selectedKey;
    if (!fundKey) return;

    this.store.dispatch(
      FundsApiActions.loadFundInvestorsPage({
        fundKey,
        page: detail.fundInvestorsPage + 1,
        search: detail.fundInvestorsSearch,
      }),
    );
  }

  private cleanupDeepLinkQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const hasDeepLinkParams =
      params.has('selected') || params.has('search') || params.has('detailTab');
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
    this.store.dispatch(FundsApiActions.loadListMore());
  }

  selectInvestment(fund: FundListItemDto): void {
    this.requestDetail(fund.fundKey);
  }

  clearSelection(): void {
    this.store.dispatch(FundsApiActions.clearDetail());
    this.activeTabIndex.set(0);
  }

  deploymentPercent(): number {
    return this.summaryNumber('capitalDeployed');
  }

  summaryDisplay(key: string): string {
    const summary = this.fundDetail()?.summary as unknown as Record<string, unknown> | undefined;
    const raw = summary?.[key] ?? null;
    return String(raw).trim() || '—';
    // if (raw == null) return '—';
    // if (typeof raw === 'number') {
    //   if (key.toLowerCase().includes('percent')) return formatPercent(raw, true);
    //   return formatCurrency(raw);
    // }
    // if (typeof raw === 'string') return raw.trim() || '—';
    // if (typeof raw === 'boolean') return String(raw);
    // return String(raw).trim() || '—';
  }

  summaryNumber(key: string): number {
    const summary = this.fundDetail()?.summary as unknown as Record<string, unknown> | undefined;
    const raw = summary?.[key] ?? null;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
  }

  goToAsset(row: FundAssetTabRow): void {
    if (row.propertyKey == null) return;
    void this.router.navigate(['../asset'], {
      relativeTo: this.route,
      queryParams: {
        selected: row.propertyKey,
        search: row.assetName !== '—' ? row.assetName : undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  goToInvestor(investor: FundInvestorTabRow): void {
    if (!investor.investorKey) return;
    void this.router.navigate(['../investor'], {
      relativeTo: this.route,
      queryParams: {
        selected: investor.investorKey,
        search: investor.investorName !== '—' ? investor.investorName : undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  clearAssetSearch(): void {
    if (!this.assetSearchQuery()) return;
    this.assetSearchQuery.set('');
  }

  clearInvestorSearch(): void {
    if (!this.investorSearchQuery()) return;
    this.investorSearchQuery.set('');
  }

  private readonly selectedIdFromRoute = () => {
    const value = this.route.snapshot.queryParamMap.get('selected');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  private ensureSelectedInListAndScroll(): void {
    let key = this.pendingScrollKey ?? this.selectedFundKey();
    if (key == null && this.pendingSelectName) {
      key = this.matchFundKeyByName(this.pendingSelectName);
      if (key != null) this.pendingScrollKey = key;
    }
    if (key == null) {
      if (this.pendingAutoOpenFirst) {
        const first = this.funds()[0] ?? null;
        if (first) {
          this.pendingAutoOpenFirst = false;
          this.pendingScrollKey = first.fundKey;
          this.requestDetail(first.fundKey);
          this.scrollToSelected(first.fundKey);
        }
      }
      return;
    }

    const selectedFund = this.funds().find((fund) => fund.fundKey === key) ?? null;
    if (selectedFund) {
      this.requestDetail(key);
      this.scrollToSelected(key);
      return;
    }

    // If the requested key isn't in the search results, fall back to an unambiguous name match.
    if (!this.hasNextPage() && this.pendingSelectName) {
      const byName = this.matchFundKeyByName(this.pendingSelectName);
      if (byName != null && byName !== key) {
        this.pendingScrollKey = byName;
        this.requestDetail(byName);
        this.scrollToSelected(byName);
        return;
      }
    }

    // If we reached the end and still didn't find the key, auto-open the first result from the deep-link search.
    if (!this.hasNextPage() && this.pendingAutoOpenFirst) {
      const first = this.funds()[0] ?? null;
      if (first) {
        this.pendingAutoOpenFirst = false;
        this.pendingScrollKey = first.fundKey;
        this.requestDetail(first.fundKey);
        this.scrollToSelected(first.fundKey);
        return;
      }
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.loadingMoreForScroll = true;
      this.store.dispatch(FundsApiActions.loadListMore());
      queueMicrotask(() => {
        this.loadingMoreForScroll = false;
      });
    }
  }

  private matchFundKeyByName(name: string): number | null {
    const needle = name.trim().toLowerCase();
    if (!needle) return null;

    const matches = this.funds().filter((fund) => {
      const hay = (fund.fundName ?? '').trim().toLowerCase();
      return hay === needle || hay.includes(needle);
    });

    if (matches.length === 1) return matches[0].fundKey;
    return null;
  }

  private requestDetail(fundKey: number): void {
    const detail = this.fundsDetailState();
    if (
      !shouldRequestDetail(detail.selectedKey, detail.loading, detail.detail != null, fundKey)
    ) {
      return;
    }
    this.loadDetail$.next(fundKey);
  }

  private scrollToSelected(key: number): void {
    const rowIndex = this.funds().findIndex((fund) => fund.fundKey === key);
    scrollListItemIntoView(() => this.listScrollContainer()?.nativeElement, key, {
      rowIndex,
      onSuccess: () => {
        this.pendingScrollKey = null;
      },
    });
  }

}

