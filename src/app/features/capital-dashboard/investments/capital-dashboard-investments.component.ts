import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
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
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { ListInfiniteScrollDirective } from '../shared/list-infinite-scroll.directive';
import { DetailStatusBadgeComponent } from '../shared/components/detail-status-badge/detail-status-badge.component';
import { OverviewSectionCardsComponent } from '../shared/components/overview-section-cards/overview-section-cards.component';
import { PortalSpinnerComponent } from '../shared/components/portal-spinner/portal-spinner.component';
import {
  FundDetailDto,
  FundInvestorDto,
  FundListItemDto,
  PagedResult,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { CapitalFundsApiService } from '../shared/services/capital-funds-api.service';
import { propertyListName, propertyLocation } from '../shared/utils/property-display.util';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';
import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';

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
    DetailStatusBadgeComponent,
    OverviewSectionCardsComponent,
    PortalSpinnerComponent,
  ],
  templateUrl: './capital-dashboard-investments.component.html',
  styleUrls: ['./capital-dashboard-investments.component.scss'],
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }
    `,
  ],
})
export class CapitalDashboardInvestmentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fundsApi = inject(CapitalFundsApiService);
  private readonly assetsApi = inject(CapitalAssetsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly propertyListName = propertyListName;
  readonly propertyLocation = propertyLocation;
  readonly overviewCards = computed(() => sectionCardsFromSections(this.fundDetail()?.sections ?? null));

  readonly searchQuery = signal('');
  readonly funds = signal<FundListItemDto[]>([]);
  readonly listLoading = signal(true);
  readonly listLoadingMore = signal(false);
  readonly listError = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly hasNextPage = signal(false);

  readonly selectedFundKey = signal<number | null>(null);
  readonly fundDetail = signal<FundDetailDto | null>(null);
  readonly fundInvestors = signal<FundInvestorDto[]>([]);
  readonly fundAssets = signal<PropertyListItemDto[]>([]);
  readonly fundAssetsLoading = signal(false);
  readonly fundAssetsLoadingMore = signal(false);
  readonly fundAssetsHasNextPage = signal(false);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  readonly focusInvestorKey = signal<number | null>(null);
  private readonly fundInvestorsWrap = viewChild<ElementRef<HTMLElement>>('fundInvestorsWrap');

  activeTabIndex = 0;
  readonly listColumns = ['investment', 'value'];

  readonly selectedInvestment = computed(() => this.fundDetail());

  private currentPage = 1;
  private currentSearch = '';
  private pendingScrollKey: number | null = null;
  private pendingSelectName: string | null = null;
  private pendingAutoOpenFirst = false;
  private loadingMoreForScroll = false;
  private fundAssetsPage = 1;
  private fundAssetsFundCode: string | null = null;
  private fundAssetsFundKey: number | null = null;

  private readonly listScrollContainer = viewChild<ElementRef<HTMLElement>>('listScrollContainer');
  private readonly loadDetail$ = new Subject<number>();

  constructor() {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const focusRaw = params.get('focusInvestor');
        const focusParsed = focusRaw ? Number(focusRaw) : NaN;
        this.focusInvestorKey.set(Number.isFinite(focusParsed) ? focusParsed : null);

        const detailTab = params.get('detailTab');
        if (detailTab === 'investors') this.activeTabIndex = 2;
        if (detailTab === 'assets') this.activeTabIndex = 1;
        if (detailTab === 'overview') this.activeTabIndex = 0;

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
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((search) => {
          this.currentSearch = search;
          this.currentPage = 1;
          // pendingScrollKey may already be set from query params subscription.
          this.pendingScrollKey = this.pendingScrollKey ?? this.selectedIdFromRoute();
          this.listLoading.set(true);
          this.listError.set(null);
          this.hasNextPage.set(false);
        }),
        switchMap((search) =>
          this.fundsApi.getFunds({ search: search || undefined, page: 1, pageSize: LIST_PAGE_SIZE }).pipe(
            catchError(() => {
              this.listError.set('Unable to load investments. Please try again.');
              return of(emptyPagedResult<FundListItemDto>());
            }),
            finalize(() => this.listLoading.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applyPageResult(result, true));

    this.loadDetail$
      .pipe(
        switchMap((fundKey) => {
          this.selectedFundKey.set(fundKey);
          this.fundAssets.set([]);
          this.fundAssetsHasNextPage.set(false);
          this.fundAssetsLoadingMore.set(false);
          this.fundAssetsPage = 1;
          this.fundAssetsFundKey = fundKey;
          this.detailLoading.set(true);
          this.detailError.set(null);
          this.activeTabIndex = 0;

          return forkJoin({
            detail: this.fundsApi.getFund(fundKey),
            investors: this.fundsApi.getFundInvestors(fundKey),
          }).pipe(
            switchMap(({ detail, investors }) => {
              this.fundAssetsLoading.set(true);
              const fundCode = detail.summary.fundCode?.trim() || null;
              this.fundAssetsFundCode = fundCode;
              return this.assetsApi.getAssetsForFundPage(fundKey, fundCode, 1).pipe(
                map((assetsPage) => ({
                  detail,
                  investors,
                  assets: assetsPage.items ?? [],
                  assetsHasNext: assetsPage.hasNextPage,
                })),
                catchError(() => of({ detail, investors, assets: [] as PropertyListItemDto[], assetsHasNext: false })),
                finalize(() => this.fundAssetsLoading.set(false)),
              );
            }),
            catchError(() => {
              this.detailError.set('Unable to load investment details.');
              this.fundDetail.set(null);
              this.fundInvestors.set([]);
              this.fundAssets.set([]);
              return of(null);
            }),
            finalize(() => this.detailLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return;
        this.fundDetail.set(result.detail);
        this.fundInvestors.set(result.investors);
        this.fundAssets.set(result.assets);
        this.fundAssetsHasNextPage.set(result.assetsHasNext);
        this.scrollFocusedInvestorIntoView();
        this.cleanupDeepLinkQueryParams();
      });
  }

  loadMoreFundAssets(): void {
    if (this.fundAssetsLoading() || this.fundAssetsLoadingMore() || !this.fundAssetsHasNextPage()) return;
    const fundKey = this.fundAssetsFundKey;
    const fundCode = this.fundAssetsFundCode;
    if (!fundKey || !fundCode?.trim()) return;

    this.fundAssetsLoadingMore.set(true);
    const nextPage = this.fundAssetsPage + 1;

    this.assetsApi
      .getAssetsForFundPage(fundKey, fundCode, nextPage)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.fundAssetsLoadingMore.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (!page) return;
        this.fundAssetsPage = nextPage;
        this.fundAssets.update((list) => [...list, ...(page.items ?? [])]);
        this.fundAssetsHasNextPage.set(page.hasNextPage);
      });
  }

  private cleanupDeepLinkQueryParams(): void {
    const params = this.route.snapshot.queryParamMap;
    const hasDeepLinkParams =
      params.has('selected') || params.has('search') || params.has('detailTab') || params.has('focusInvestor');
    if (!hasDeepLinkParams) return;

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        selected: null,
        search: null,
        detailTab: null,
        focusInvestor: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private scrollFocusedInvestorIntoView(): void {
    const key = this.focusInvestorKey();
    if (key == null) return;
    // Ensure the Investors tab is visible
    this.activeTabIndex = 2;

    queueMicrotask(() => {
      const host = this.fundInvestorsWrap()?.nativeElement;
      if (!host) return;
      const target = host.querySelector<HTMLElement>(`[data-investor-key="${key}"]`);
      target?.scrollIntoView({ block: 'center' });
    });
  }

  loadMore(): void {
    this.fetchNextPage(false);
  }

  selectInvestment(fund: FundListItemDto): void {
    if (this.selectedFundKey() === fund.fundKey && this.fundDetail()) return;
    this.loadDetail$.next(fund.fundKey);
  }

  clearSelection(): void {
    this.selectedFundKey.set(null);
    this.fundDetail.set(null);
    this.fundInvestors.set([]);
    this.fundAssets.set([]);
    this.detailError.set(null);
    this.activeTabIndex = 0;
  }

  deploymentPercent(): number {
    const current = this.summaryNumber('currentValue');
    const invested = this.summaryNumber('investedAmount');
    if (current <= 0 || invested <= 0) return 0;
    return Math.min(100, (invested / current) * 100);
  }

  summaryDisplay(key: string): string {
    const summary = this.fundDetail()?.summary as unknown as Record<string, unknown> | undefined;
    const raw = summary?.[key] ?? null;
    if (raw == null) return '—';
    if (typeof raw === 'number') {
      if (key.toLowerCase().includes('percent')) return formatPercent(raw, true);
      return formatCurrency(raw);
    }
    if (typeof raw === 'string') return raw.trim() || '—';
    if (typeof raw === 'boolean') return String(raw);
    return String(raw).trim() || '—';
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

  investorIcon(type: string | null | undefined): string {
    if (type === 'Institution') return 'business';
    if (type === 'Family Office' || type === 'Trust') return 'account_balance';
    return 'person';
  }

  goToInvestor(investorKey: number, investorName: string | null | undefined): void {
    void this.router.navigate(['../investor'], {
      relativeTo: this.route,
      queryParams: {
        selected: investorKey,
        search: investorName?.trim() || undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  goToAsset(propertyKey: number, assetName: string | null | undefined): void {
    void this.router.navigate(['../asset'], {
      relativeTo: this.route,
      queryParams: {
        selected: propertyKey,
        search: assetName?.trim() || undefined,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  memberSinceDisplay(row: FundInvestorDto): string {
    const year = row.joinYear;
    if (typeof year === 'number' && Number.isFinite(year) && year > 0) {
      return `Member since ${Math.trunc(year)}`;
    }
    return 'Member since —';
  }

  private readonly selectedIdFromRoute = () => {
    const value = this.route.snapshot.queryParamMap.get('selected');
    if (!value) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  private applyPageResult(result: PagedResult<FundListItemDto>, replace: boolean): void {
    const items = result.items ?? [];
    if (replace) {
      this.funds.set([...items]);
      this.currentPage = result.page || 1;
    } else {
      this.funds.update((list) => [...list, ...items]);
      this.currentPage = result.page || this.currentPage + 1;
    }
    this.totalCount.set(result.totalCount ?? 0);
    this.hasNextPage.set(result.hasNextPage);
    this.ensureSelectedInListAndScroll();
  }

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
          this.loadDetail$.next(first.fundKey);
          this.scrollToSelected(first.fundKey);
        }
      }
      return;
    }

    const selectedFund = this.funds().find((fund) => fund.fundKey === key) ?? null;
    if (selectedFund) {
      // If we deep-linked into this tab, also load the right-side detail panel.
      if (this.selectedFundKey() !== key || !this.fundDetail()) {
        this.loadDetail$.next(key);
      }
      this.scrollToSelected(key);
      return;
    }

    // If the requested key isn't in the search results, fall back to an unambiguous name match.
    if (!this.hasNextPage() && this.pendingSelectName) {
      const byName = this.matchFundKeyByName(this.pendingSelectName);
      if (byName != null && byName !== key) {
        this.pendingScrollKey = byName;
        this.loadDetail$.next(byName);
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
        this.loadDetail$.next(first.fundKey);
        this.scrollToSelected(first.fundKey);
        return;
      }
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.fetchNextPage(true);
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

  private scrollToSelected(key: number): void {
    const rowIndex = this.funds().findIndex((fund) => fund.fundKey === key);
    scrollListItemIntoView(() => this.listScrollContainer()?.nativeElement, key, {
      rowIndex,
      onSuccess: () => {
        this.pendingScrollKey = null;
      },
    });
  }

  private fetchNextPage(forScroll: boolean): void {
    if (this.listLoading() || this.listLoadingMore() || !this.hasNextPage()) return;

    const nextPage = this.currentPage + 1;
    this.listLoadingMore.set(true);
    if (forScroll) this.loadingMoreForScroll = true;

    this.fundsApi
      .getFunds({
        search: this.currentSearch || undefined,
        page: nextPage,
        pageSize: LIST_PAGE_SIZE,
      })
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.listLoadingMore.set(false);
          this.loadingMoreForScroll = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        this.applyPageResult(result, false);
      });
  }
}

function emptyPagedResult<T>(): PagedResult<T> {
  return {
    items: [],
    page: 1,
    pageSize: LIST_PAGE_SIZE,
    totalCount: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

