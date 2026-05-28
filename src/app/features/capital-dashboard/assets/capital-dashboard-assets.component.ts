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
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { LIST_PAGE_SIZE } from '../shared/list-pagination.constants';
import { ListInfiniteScrollDirective } from '../shared/list-infinite-scroll.directive';
import { PortalSpinnerComponent } from '../shared/components/portal-spinner/portal-spinner.component';
import {
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { CapitalAssetsApiService } from '../shared/services/capital-assets-api.service';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';
import {
  propertyDetailLocation,
  propertyDetailName,
  propertyFieldString,
  propertyListName,
  propertyLocation,
} from '../shared/utils/property-display.util';
import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';

@Component({
  selector: 'app-capital-dashboard-assets',
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
  templateUrl: './capital-dashboard-assets.component.html',
  styleUrls: ['./capital-dashboard-assets.component.scss'],
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
export class CapitalDashboardAssetsComponent {
  private readonly assetsApi = inject(CapitalAssetsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly propertyListName = propertyListName;
  readonly propertyLocation = propertyLocation;
  readonly propertyDetailName = propertyDetailName;
  readonly propertyDetailLocation = propertyDetailLocation;
  readonly propertyFieldString = propertyFieldString;
  readonly overviewCards = computed(() => sectionCardsFromSections(this.assetDetail()?.sections ?? null));

  readonly searchQuery = signal('');
  readonly assets = signal<PropertyListItemDto[]>([]);
  readonly listLoading = signal(true);
  readonly listLoadingMore = signal(false);
  readonly listError = signal<string | null>(null);
  readonly totalCount = signal(0);
  readonly hasNextPage = signal(false);

  readonly selectedPropertyKey = signal<number | null>(null);
  readonly assetDetail = signal<PropertyDetailDto | null>(null);
  readonly assetInvestments = signal<PropertyInvestmentDto[]>([]);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);

  activeTabIndex = 0;
  readonly listColumns = ['asset', 'value'];

  readonly selectedAsset = computed(() => this.assetDetail());

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
          this.assetsApi.getAssets({ search: search || undefined, page: 1, pageSize: LIST_PAGE_SIZE }).pipe(
            catchError(() => {
              this.listError.set('Unable to load assets. Please try again.');
              return of(emptyPagedResult<PropertyListItemDto>());
            }),
            finalize(() => this.listLoading.set(false)),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.applyPageResult(result, true));

    this.loadDetail$
      .pipe(
        switchMap((propertyKey) => {
          this.selectedPropertyKey.set(propertyKey);
          this.detailLoading.set(true);
          this.detailError.set(null);
          this.activeTabIndex = 0;

          return forkJoin({
            detail: this.assetsApi.getAsset(propertyKey),
            investments: this.assetsApi.getAssetInvestments(propertyKey),
          }).pipe(
            catchError(() => {
              this.detailError.set('Unable to load asset details.');
              this.assetDetail.set(null);
              this.assetInvestments.set([]);
              return of(null);
            }),
            finalize(() => this.detailLoading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (!result) return;
        this.assetDetail.set(result.detail);
        this.assetInvestments.set(result.investments);
      });
  }

  loadMore(): void {
    this.fetchNextPage(false);
  }

  selectAsset(asset: PropertyListItemDto): void {
    if (this.selectedPropertyKey() === asset.propertyKey && this.assetDetail()) return;
    this.loadDetail$.next(asset.propertyKey);
  }

  clearSelection(): void {
    this.selectedPropertyKey.set(null);
    this.assetDetail.set(null);
    this.assetInvestments.set([]);
    this.detailError.set(null);
    this.activeTabIndex = 0;
  }

  assetIcon(type: string | null | undefined): string {
    switch (type) {
      case 'Real Estate':
      case 'Residential':
      case 'Commercial':
        return 'home';
      case 'Equity':
        return 'show_chart';
      case 'Fixed Income':
        return 'account_balance';
      default:
        return 'category';
    }
  }

  goToInvestment(_fundKey: number): void {}

  assetDetailListValue(detail: PropertyDetailDto): number {
    return this.assets().find((asset) => asset.propertyKey === detail.propertyKey)?.currentValue ?? 0;
  }

  private applyPageResult(result: PagedResult<PropertyListItemDto>, replace: boolean): void {
    const items = result.items ?? [];
    if (replace) {
      this.assets.set([...items]);
      this.currentPage = result.page || 1;
    } else {
      this.assets.update((list) => [...list, ...items]);
      this.currentPage = result.page || this.currentPage + 1;
    }
    this.totalCount.set(result.totalCount ?? 0);
    this.hasNextPage.set(result.hasNextPage);
    this.ensureSelectedInListAndScroll();
  }

  private ensureSelectedInListAndScroll(): void {
    const key = this.pendingScrollKey ?? this.selectedPropertyKey();
    if (key == null || this.listLoading()) return;

    if (this.assets().some((asset) => asset.propertyKey === key)) {
      this.scrollToSelected(key);
      return;
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.fetchNextPage(true);
    }
  }

  private scrollToSelected(key: number): void {
    const rowIndex = this.assets().findIndex((asset) => asset.propertyKey === key);
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

    this.assetsApi
      .getAssets({
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

