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
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

import { AssetsApiActions } from '../store';
import { extractPagedItems } from '../store/capital-dashboard-cache.util';
import { selectAssetsDetail, selectAssetsList } from '../store/capital-dashboard.selectors';
import { ListInfiniteScrollDirective } from '../shared/list-infinite-scroll.directive';
import { DetailStatusBadgeComponent } from '../shared/components/detail-status-badge/detail-status-badge.component';
import { OverviewSectionCardsComponent } from '../shared/components/overview-section-cards/overview-section-cards.component';
import { PortalSpinnerComponent } from '../shared/components/portal-spinner/portal-spinner.component';
import { PropertyListItemDto } from '../shared/models/api.models';
import { formatCurrency, formatPercent } from '../shared/utils/format-currency.util';
import { scrollListItemIntoView } from '../shared/utils/list-scroll.util';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { formatByFormatType } from '../shared/utils/dynamic-sections.util';
import {
  propertyDetailAcquisitionYear,
  propertyDetailInvestmentsCount,
  propertyDetailLocation,
  propertyDetailName,
  propertyFieldString,
  propertyFieldValue,
  propertyListName,
  propertyListSubtitle,
} from '../shared/utils/property-display.util';
import { sectionCardsFromSections } from '../shared/utils/dynamic-sections.util';
import { shouldRequestDetail } from '../shared/utils/should-request-detail.util';

@Component({
  selector: 'app-capital-dashboard-assets',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MatTabsModule,
    ListInfiniteScrollDirective,
    DetailStatusBadgeComponent,
    OverviewSectionCardsComponent,
    PortalSpinnerComponent,
    KsCurrencyPipe,
  ],
  templateUrl: './capital-dashboard-assets.component.html',
  styleUrl: './capital-dashboard-assets.component.scss',
})
export class CapitalDashboardAssetsComponent {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly assetsListState = this.store.selectSignal(selectAssetsList);
  private readonly assetsDetailState = this.store.selectSignal(selectAssetsDetail);

  readonly formatCurrency = formatCurrency;
  readonly formatPercent = formatPercent;
  readonly propertyListName = propertyListName;
  readonly propertyListSubtitle = propertyListSubtitle;
  readonly propertyDetailName = propertyDetailName;
  readonly propertyDetailLocation = propertyDetailLocation;
  readonly overviewCards = computed(() => sectionCardsFromSections(this.assetDetail()?.sections ?? null));

  readonly selectedListAsset = computed(() => {
    const key = this.selectedPropertyKey();
    if (key == null) return null;
    return this.assets().find((asset) => asset.propertyKey === key) ?? null;
  });

  readonly searchQuery = signal('');
  readonly assets = computed(() => extractPagedItems(this.assetsListState().items));
  readonly listLoading = computed(() => this.assetsListState().loading);
  readonly listLoadingMore = computed(() => this.assetsListState().loadingMore);
  readonly listError = computed(() => this.assetsListState().error);
  readonly totalCount = computed(() => this.assetsListState().totalCount);
  readonly hasNextPage = computed(() => this.assetsListState().hasNextPage);

  readonly selectedPropertyKey = computed(() => this.assetsDetailState().selectedKey);
  readonly assetDetail = computed(() => this.assetsDetailState().detail);
  readonly assetInvestments = computed(() => extractPagedItems(this.assetsDetailState().investments));
  readonly detailLoading = computed(() => this.assetsDetailState().loading);
  readonly detailError = computed(() => this.assetsDetailState().error);

  activeTabIndex = 0;
  readonly listColumns = ['asset', 'value'];
  readonly assetInvestmentColumns = [
    'name',
    'type',
    'strategy',
    'status',
    'value',
    'return',
  ] as const;

  readonly selectedAsset = computed(() => this.assetDetail());

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
        const selectedRaw = params.get('selected');
        const selectedParsed = selectedRaw ? Number(selectedRaw) : NaN;
        this.pendingScrollKey = Number.isFinite(selectedParsed) ? selectedParsed : null;

        const detailTab = params.get('detailTab');
        if (detailTab === 'investments') this.activeTabIndex = 1;
        if (detailTab === 'overview') this.activeTabIndex = 0;

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
        this.store.dispatch(AssetsApiActions.loadList({ search, page: 1, replace: true }));
      });

    const initialSelected = this.selectedIdFromRoute();
    if (initialSelected != null) {
      this.pendingScrollKey = initialSelected;
    }

    this.loadDetail$.pipe(takeUntilDestroyed()).subscribe((propertyKey) => {
      this.activeTabIndex = 0;
      this.store.dispatch(AssetsApiActions.loadDetail({ propertyKey }));
    });

    effect(() => {
      const list = this.assetsListState();
      if (!list.loading && !list.loadingMore) {
        this.ensureSelectedInListAndScroll();
      }
    });

    effect(() => {
      const detail = this.assetsDetailState();
      if (!detail.loading && detail.detail) {
        this.cleanupDeepLinkQueryParams();
      }
    });
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
    this.store.dispatch(AssetsApiActions.loadListMore());
  }

  selectAsset(asset: PropertyListItemDto): void {
    this.requestDetail(asset.propertyKey);
  }

  clearSelection(): void {
    this.store.dispatch(AssetsApiActions.clearDetail());
    this.activeTabIndex = 0;
  }

  listOwnershipDisplay(item: PropertyListItemDto): string {
    if (item.ownership == null) return '—';
    return formatByFormatType(item.ownership, 'boolean') ?? '—';
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

  goToInvestment(fundKey: number, fundName: string | null | undefined): void {
    void this.router.navigate(['../investment'], {
      relativeTo: this.route,
      queryParams: {
        selected: fundKey,
        search: fundName?.trim() || undefined,
        detailTab: 'assets',
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

  assetDisplayName(): string {
    const detail = this.assetDetail();
    const fromDetail = propertyDetailName(detail);
    const key = detail?.propertyKey ?? detail?.summary?.propertyKey ?? this.selectedPropertyKey();
    if (fromDetail !== 'Property' && (key == null || fromDetail !== `Property ${key}`)) {
      return fromDetail;
    }
    const listItem = this.selectedListAsset();
    if (listItem) return propertyListName(listItem);
    return fromDetail;
  }

  summaryDisplay(key: string): string {
    const detail = this.assetDetail();
    const raw = propertyFieldString(detail, key);
    if (raw) return raw;
    return '—';
  }

  summaryMoney(key: string): string {
    const raw = propertyFieldString(this.assetDetail(), key);
    if (raw) {
      const parsed = Number(raw.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed)) return formatCurrency(parsed);
      return raw;
    }
    return '—';
  }

  ownershipDisplay(): string {
    const raw = propertyFieldValue(this.assetDetail(), 'ownership');
    if (raw == null) return '—';
    return formatByFormatType(raw, 'boolean') ?? '—';
  }

  isPortfolioDisplay(): string {
    const raw = propertyFieldValue(this.assetDetail(), 'isPortfolio');
    if (raw == null) return '—';
    return formatByFormatType(raw, 'boolean') ?? '—';
  }

  assetSizeDisplay(): string {
    const raw = propertyFieldValue(this.assetDetail(), 'assetSize');
    if (raw == null) return '—';
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return '—';
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) return String(parsed);
      return trimmed;
    }
    return '—';
  }

  summaryNumber(key: string): number {
    if (key === 'investments') {
      const count = propertyDetailInvestmentsCount(this.assetDetail());
      if (count != null) return count;
    }
    const raw = propertyFieldString(this.assetDetail(), key);
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return this.assetInvestments().length;
  }

  acquisitionDateDisplay(): string {
    return propertyDetailAcquisitionYear(this.assetDetail()) ?? '—';
  }

  assetIconType(): string {
    const type = this.summaryDisplay('assetType');
    return type === '—' ? '' : type;
  }

  private ensureSelectedInListAndScroll(): void {
    let key = this.pendingScrollKey ?? this.selectedPropertyKey();
    if (key == null && this.pendingSelectName) {
      key = this.matchAssetKeyByName(this.pendingSelectName);
      if (key != null) this.pendingScrollKey = key;
    }
    if (key == null) {
      if (this.pendingAutoOpenFirst) {
        const first = this.assets()[0] ?? null;
        if (first) {
          this.pendingAutoOpenFirst = false;
          this.pendingScrollKey = first.propertyKey;
          this.requestDetail(first.propertyKey);
          this.scrollToSelected(first.propertyKey);
        }
      }
      return;
    }

    if (this.assets().some((asset) => asset.propertyKey === key)) {
      this.requestDetail(key);
      this.scrollToSelected(key);
      return;
    }

    if (!this.hasNextPage() && this.pendingSelectName) {
      const byName = this.matchAssetKeyByName(this.pendingSelectName);
      if (byName != null && byName !== key) {
        this.pendingScrollKey = byName;
        this.requestDetail(byName);
        this.scrollToSelected(byName);
        return;
      }
    }

    if (!this.hasNextPage() && this.pendingAutoOpenFirst) {
      const first = this.assets()[0] ?? null;
      if (first) {
        this.pendingAutoOpenFirst = false;
        this.pendingScrollKey = first.propertyKey;
        this.requestDetail(first.propertyKey);
        this.scrollToSelected(first.propertyKey);
        return;
      }
    }

    if (this.hasNextPage() && !this.listLoadingMore() && !this.loadingMoreForScroll) {
      this.loadingMoreForScroll = true;
      this.store.dispatch(AssetsApiActions.loadListMore());
      queueMicrotask(() => {
        this.loadingMoreForScroll = false;
      });
    }
  }

  private matchAssetKeyByName(name: string): number | null {
    const needle = name.trim().toLowerCase();
    if (!needle) return null;

    const matches = this.assets().filter((asset) => {
      const hay = (asset.propertyName ?? '').trim().toLowerCase();
      return hay === needle || hay.includes(needle);
    });

    if (matches.length === 1) return matches[0].propertyKey;
    return null;
  }

  private requestDetail(propertyKey: number): void {
    const detail = this.assetsDetailState();
    if (
      !shouldRequestDetail(
        detail.selectedKey,
        detail.loading,
        detail.detail != null,
        propertyKey,
      )
    ) {
      return;
    }
    this.loadDetail$.next(propertyKey);
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

}

