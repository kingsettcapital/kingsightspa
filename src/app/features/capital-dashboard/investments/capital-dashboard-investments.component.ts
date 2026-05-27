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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatProgressBarModule,
    MatTableModule,
    MatTabsModule,
    ListInfiniteScrollDirective,
    PortalSpinnerComponent,
  ],
  templateUrl: './capital-dashboard-investments.component.html',
  styleUrls: ['./capital-dashboard-investments.component.scss'],
})
export class CapitalDashboardInvestmentsComponent {
  private readonly route = inject(ActivatedRoute);
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
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  activeTabIndex = 0;
  readonly listColumns = ['investment', 'value'];

  readonly selectedInvestment = computed(() => this.fundDetail());

  private currentPage = 1;
  private currentSearch = '';
  private pendingScrollKey: number | null = null;
  private loadingMoreForScroll = false;

  private readonly listScrollContainer = viewChild<ElementRef<HTMLElement>>('listScrollContainer');
  private readonly loadDetail$ = new Subject<number>();

  constructor() {
    toObservable(this.searchQuery)
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap((search) => {
          this.currentSearch = search;
          this.currentPage = 1;
          this.pendingScrollKey = this.selectedIdFromRoute();
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
          this.detailLoading.set(true);
          this.detailError.set(null);
          this.activeTabIndex = 0;

          return forkJoin({
            detail: this.fundsApi.getFund(fundKey),
            investors: this.fundsApi.getFundInvestors(fundKey),
          }).pipe(
            switchMap(({ detail, investors }) => {
              this.fundAssetsLoading.set(true);
              const { fundCode, assets } = detail.summary;
              return this.assetsApi.getAssetsForFund(fundKey, fundCode, assets).pipe(
                map((assets) => ({ detail, investors, assets })),
                catchError(() => of({ detail, investors, assets: [] as PropertyListItemDto[] })),
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

  goToInvestor(_investorKey: number): void {}
  goToAsset(_propertyKey: number): void {}

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
    const key = this.pendingScrollKey ?? this.selectedFundKey();
    if (key == null || this.listLoading()) return;

    if (this.funds().some((fund) => fund.fundKey === key)) {
      this.scrollToSelected(key);
      return;
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.fetchNextPage(true);
    }
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

