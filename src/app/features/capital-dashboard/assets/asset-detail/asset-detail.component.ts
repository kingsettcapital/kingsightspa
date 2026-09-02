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
import { AssetTableRow } from '../../shared/utils/asset-list-row.util';
import { InvestorDetailSidebarComponent } from '../../investors/investor-detail/investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from '../../investors/investor-detail/investor-detail-block/investor-detail-block.component';
import { InvestorDetailBlock } from '../../investors/investor-detail/models/investor-detail-block.models';
import { InvestorDetailTableRow } from '../../investors/investor-detail/models/investor-detail-table.models';
import { AssetsApiActions } from '../../store';
import { selectAssetsDetail } from '../../store/capital-dashboard.selectors';
import { fundTableRowFromFundExposure } from '../../shared/utils/fund-list-row.util';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { ASSET_DETAIL_SIDEBAR_SECTIONS } from './models/asset-detail-sidebar.config';
import {
  ASSET_DETAIL_EMPTY,
  formatAssetDisplaySqFt,
  propertyDetailHasProfileData,
  readPropertyDetailString,
} from './utils/asset-detail-api.util';
import {
  AssetDetailSectionId,
  buildFlatAssetBlocks,
  formatAssetKpiHint,
  kpiCardsFromAssetDetail,
} from './utils/asset-detail-tables.util';

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  providers: [KsCurrencyPipe],
  templateUrl: './asset-detail.component.html',
  styleUrl: './asset-detail.component.scss',
})
export class AssetDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ksCurrency = inject(KsCurrencyPipe);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly stickyChromeRef = viewChild<ElementRef<HTMLElement>>('stickyChrome');

  private static readonly SECTION_SCROLL_GAP_PX = 8;

  readonly sidebarSections = ASSET_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<AssetDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly propertyKey = signal<number | null>(null);
  readonly listRow = signal<AssetTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectAssetsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly detail = computed(() => this.detailState().detail);
  readonly leasingSummary = computed(() => this.detailState().leasingSummary);

  readonly contentLoading = computed(
    () => this.loading() && !this.detail() && !this.listRow(),
  );

  readonly hasMetricData = computed(
    () => propertyDetailHasProfileData(this.detail()) || this.listRow() != null,
  );

  readonly propertyName = computed(() => {
    const fromDetail = readPropertyDetailString(
      this.detail(),
      'property_name',
      'propertyName',
    );
    if (fromDetail) {
      return fromDetail;
    }
    return this.listRow()?.name || ASSET_DETAIL_EMPTY;
  });

  readonly assetType = computed(() => {
    const fromDetail = readPropertyDetailString(this.detail(), 'asset_type', 'assetType');
    if (fromDetail) {
      return fromDetail;
    }
    return this.listRow()?.assetType || ASSET_DETAIL_EMPTY;
  });

  readonly statusLabel = computed(() => {
    const fromDetail = readPropertyDetailString(this.detail(), 'status');
    if (fromDetail) {
      return fromDetail;
    }
    return this.listRow()?.status || ASSET_DETAIL_EMPTY;
  });

  readonly subtitleLeadText = computed(() => {
    const detail = this.detail();
    const row = this.listRow();
    const geography = formatAssetDisplayString(
      readPropertyDetailString(detail, 'geography') || row?.geography || '',
    );
    const investmentType = formatAssetDisplayString(
      readPropertyDetailString(detail, 'investment_type', 'investmentType') ||
        row?.investmentType ||
        '',
    );
    const developmentType = formatAssetDisplayString(
      readPropertyDetailString(detail, 'development_type', 'developmentType') ||
        row?.developmentType ||
        '',
    );

    return [geography, investmentType, developmentType]
      .filter((part) => part && part !== ASSET_DETAIL_EMPTY)
      .join(' · ');
  });

  readonly propertyCodeDisplay = computed(() => {
    const detail = this.detail();
    const row = this.listRow();
    const code = formatAssetDisplayString(
      readPropertyDetailString(detail, 'property_code', 'propertyCode') || row?.code || '',
    );
    return code && code !== ASSET_DETAIL_EMPTY ? code : '';
  });

  readonly showAssetTypeChip = computed(() => {
    const value = this.assetType();
    return Boolean(value && value !== ASSET_DETAIL_EMPTY);
  });

  readonly showStatusChip = computed(() => {
    const value = this.statusLabel();
    return Boolean(value && value !== ASSET_DETAIL_EMPTY);
  });

  readonly kpiCards = computed(() =>
    kpiCardsFromAssetDetail(this.detail(), this.listRow()),
  );

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    return buildFlatAssetBlocks(
      state.detail,
      state.leasingSummary,
      this.kpiCards(),
      this.listRow(),
      state.fundHoldings,
      state.propertyDetails,
      state.assetTypeSummary,
      state.financialMetrics,
      state.acquisitionSale,
    );
  });

  readonly formatAssetKpiHint = formatAssetKpiHint;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('propertyKey'))),
        takeUntilDestroyed(),
      )
      .subscribe((propertyKey) => {
        if (!Number.isFinite(propertyKey) || propertyKey <= 0) {
          void this.router.navigate(['/capital-dashboard/asset']);
          return;
        }

        this.propertyKey.set(propertyKey);
        this.store.dispatch(AssetsApiActions.loadDetail({ propertyKey }));
        this.store.dispatch(AssetsApiActions.loadFundHoldings({ propertyKey }));
      });

    const navigationState = (history.state ?? {}) as { assetRow?: AssetTableRow };
    if (navigationState.assetRow) {
      this.listRow.set(navigationState.assetRow);
    }

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(AssetsApiActions.clearDetail());
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
            this.getStickyScrollOffset() + AssetDetailComponent.SECTION_SCROLL_GAP_PX,
        });
      });

      onCleanup(() => {
        cancelAnimationFrame(frame);
        detachSpy?.();
        resizeObserver?.disconnect();
      });
    });
  }

  formatKpiSqFt(value: number | null): string {
    if (!this.hasMetricData()) {
      return ASSET_DETAIL_EMPTY;
    }
    return formatAssetDisplaySqFt(value, true);
  }

  formatKpiAmount(value: number | null): string {
    if (!this.hasMetricData() || value == null || !Number.isFinite(value) || value <= 0) {
      return ASSET_DETAIL_EMPTY;
    }
    return this.ksCurrency.transform(value, 'USD', 2, true);
  }

  scrollToSection(sectionId: string): void {
    this.scrollSpyPaused.set(true);
    this.activeSectionId.set(sectionId as AssetDetailSectionId);

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
            this.getStickyScrollOffset() + AssetDetailComponent.SECTION_SCROLL_GAP_PX;
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

  backToList(): void {
    void this.router.navigate(['/capital-dashboard/asset']);
  }

  tableLoadingForBlock(block: InvestorDetailBlock): boolean {
    if (block.kind !== 'table') {
      return false;
    }
    if (block.id === 'asset-fund-holdings') {
      return this.detailState().fundHoldingsLoading;
    }
    if (block.id === 'property-details') {
      return this.detailState().propertyDetailsLoading;
    }
    return false;
  }

  openFundFromHoldings(event: { row: InvestorDetailTableRow; rowIndex: number }): void {
    const row = event.row;
    const fundKey = row['fundKey'];
    if (typeof fundKey !== 'number' || !Number.isFinite(fundKey) || fundKey <= 0) {
      return;
    }

    const fundName = typeof row['fund'] === 'string' ? row['fund'] : '—';
    const strategy = typeof row['strategy'] === 'string' ? row['strategy'] : null;
    const fundType = typeof row['fundType'] === 'string' ? row['fundType'] : null;
    const propertyKey = this.propertyKey();

    void this.router.navigate(['/capital-dashboard/investment', fundKey], {
      state: {
        fundRow: fundTableRowFromFundExposure({
          fundKey,
          fundName,
          commitment: 0,
          netInvestedCapital: 0,
          netDistributed: 0,
          reservedUncalled: 0,
          releasedCapital: 0,
          fundType,
          strategy,
          index: event.rowIndex,
        }),
        ...(propertyKey != null && propertyKey > 0
          ? {
              returnToAsset: {
                propertyKey,
                propertyName: this.propertyName(),
                assetRow: this.listRow(),
              },
            }
          : {}),
      },
    });
  }

  statusChipClass(): string {
    const status = this.statusLabel().trim().toLowerCase();
    if (status === 'active') {
      return 'inv-detail__chip inv-detail__chip--active';
    }
    return 'inv-detail__chip';
  }

  assetTypeChipClass(): string {
    return 'inv-detail__chip inv-detail__chip--asset-type';
  }
}

function formatAssetDisplayString(value: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : ASSET_DETAIL_EMPTY;
}
