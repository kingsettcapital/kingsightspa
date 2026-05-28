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
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
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
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PagedResult,
} from '../shared/models/api.models';
import { CapitalInvestorsApiService } from '../shared/services/capital-investors-api.service';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';
import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';

@Component({
  selector: 'app-capital-dashboard-investors',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatTableModule,
    MatTabsModule,
    ListInfiniteScrollDirective,
    PortalSpinnerComponent,
  ],
  templateUrl: './capital-dashboard-investors.component.html',
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
export class CapitalDashboardInvestorsComponent {
  private readonly investorsApi = inject(CapitalInvestorsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly overviewCards = computed(() =>
    sectionCardsFromSections(this.investorDetail()?.sections ?? null),
  );

  readonly searchQuery = signal('');
  readonly investors = signal<InvestorListItemDto[]>([]);
  readonly listLoading = signal(true);
  readonly listLoadingMore = signal(false);
  readonly listError = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly hasNextPage = signal(false);

  readonly selectedInvestorKey = signal<number | null>(null);
  readonly investorDetail = signal<InvestorDetailDto | null>(null);
  readonly investorInvestments = signal<InvestorInvestmentDto[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  activeTabIndex = 0;
  readonly listColumns = ['investor', 'invested'];

  readonly selectedInvestor = computed(() => this.investorDetail());

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
          this.pendingScrollKey = null;
          this.listLoading.set(true);
          this.listError.set(null);
          this.hasNextPage.set(false);
        }),
        switchMap((search) =>
          this.investorsApi.getInvestors({ search: search || undefined, page: 1, pageSize: LIST_PAGE_SIZE }).pipe(
            catchError(() => {
              this.listError.set('Unable to load investors. Please try again.');
              return of(emptyPagedResult<InvestorListItemDto>());
            }),
            finalize(() => this.listLoading.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applyPageResult(result, true));

    this.loadDetail$
      .pipe(
        switchMap((investorKey) => {
          this.selectedInvestorKey.set(investorKey);
          this.detailLoading.set(true);
          this.detailError.set(null);
          this.activeTabIndex = 0;

          return forkJoin({
            detail: this.investorsApi.getInvestor(investorKey),
            investments: this.investorsApi.getInvestorInvestments(investorKey),
          }).pipe(
            map(({ detail, investments }) => ({ detail, investments })),
            catchError(() => {
              this.detailError.set('Unable to load investor details.');
              this.investorDetail.set(null);
              this.investorInvestments.set([]);
              return of(null);
            }),
            finalize(() => this.detailLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return;
        this.investorDetail.set(result.detail);
        this.investorInvestments.set(result.investments);
      });
  }

  loadMore(): void {
    this.fetchNextPage(false);
  }

  selectInvestor(investor: InvestorListItemDto): void {
    if (this.selectedInvestorKey() === investor.investorKey && this.investorDetail()) return;
    this.loadDetail$.next(investor.investorKey);
  }

  clearSelection(): void {
    this.selectedInvestorKey.set(null);
    this.investorDetail.set(null);
    this.investorInvestments.set([]);
    this.detailError.set(null);
    this.activeTabIndex = 0;
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

  goToInvestment(_fundKey: number): void {
    // In Kingsight this will be wired to switch tabs later.
  }

  private applyPageResult(result: PagedResult<InvestorListItemDto>, replace: boolean): void {
    const items = result.items ?? [];
    if (replace) {
      this.investors.set([...items]);
      this.currentPage = result.page || 1;
    } else {
      this.investors.update((list) => [...list, ...items]);
      this.currentPage = result.page || this.currentPage + 1;
    }
    this.totalCount.set(result.totalCount ?? 0);
    this.hasNextPage.set(result.hasNextPage);
    this.ensureSelectedInListAndScroll();
  }

  private ensureSelectedInListAndScroll(): void {
    const key = this.pendingScrollKey ?? this.selectedInvestorKey();
    if (key == null || this.listLoading()) return;

    if (this.investors().some((investor) => investor.investorKey === key)) {
      this.scrollToSelected(key);
      return;
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.fetchNextPage(true);
    }
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

  private fetchNextPage(forScroll: boolean): void {
    if (this.listLoading() || this.listLoadingMore() || !this.hasNextPage()) return;

    const nextPage = this.currentPage + 1;
    this.listLoadingMore.set(true);
    if (forScroll) this.loadingMoreForScroll = true;

    this.investorsApi
      .getInvestors({
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

