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
import { AssetTableRow, formatSquareFeet } from '../../shared/utils/asset-list-row.util';
import {
  propertyDetailLocation,
  propertyDetailName,
} from '../../shared/utils/property-display.util';
import { InvestorDetailSidebarComponent } from '../../investors/investor-detail/investor-detail-sidebar/investor-detail-sidebar.component';
import { InvestorDetailBlockComponent } from '../../investors/investor-detail/investor-detail-block/investor-detail-block.component';
import { AssetsApiActions } from '../../store';
import { selectAssetsDetail } from '../../store/capital-dashboard.selectors';
import {
  bindDetailSectionScrollSpy,
  flattenSidebarSectionIds,
} from '../../shared/utils/detail-section-scroll-spy.util';
import { ASSET_DETAIL_DUMMY } from './data/asset-detail-dummy.data';
import { ASSET_DETAIL_SIDEBAR_SECTIONS } from './models/asset-detail-sidebar.config';
import {
  AssetDetailSectionId,
  buildFlatAssetBlocks,
  formatAssetKpiHint,
  kpiCardsFromAssetRow,
} from './utils/asset-detail-tables.util';

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    KsCurrencyPipe,
    InvestorDetailSidebarComponent,
    InvestorDetailBlockComponent,
  ],
  templateUrl: './asset-detail.component.html',
  styleUrl: './asset-detail.component.scss',
})
export class AssetDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  private readonly mainContentRef = viewChild<ElementRef<HTMLElement>>('mainContent');

  readonly sidebarSections = ASSET_DETAIL_SIDEBAR_SECTIONS;
  readonly activeSectionId = signal<AssetDetailSectionId>('overview');
  private readonly scrollSpyPaused = signal(false);
  readonly propertyKey = signal<number | null>(null);
  readonly listRow = signal<AssetTableRow | null>(null);

  private readonly detailState = this.store.selectSignal(selectAssetsDetail);

  readonly loading = computed(() => this.detailState().loading);
  readonly detail = computed(() => this.detailState().detail);

  readonly propertyName = computed(
    () =>
      this.listRow()?.name ??
      propertyDetailName(this.detail()) ??
      ASSET_DETAIL_DUMMY.propertyName,
  );

  readonly assetType = computed(
    () =>
      this.listRow()?.assetType ??
      this.detail()?.summary?.assetType ??
      ASSET_DETAIL_DUMMY.assetType,
  );

  readonly statusLabel = computed(
    () =>
      this.listRow()?.status ??
      this.detail()?.summary?.status ??
      ASSET_DETAIL_DUMMY.status,
  );

  readonly subtitleText = computed(() => {
    const row = this.listRow();
    const detail = this.detail();
    const dummy = ASSET_DETAIL_DUMMY;
    const location =
      row?.geography && row.geography !== '—'
        ? row.geography
        : propertyDetailLocation(detail) ?? `${dummy.city}, ${dummy.province}`;
    const parts = [
      location,
      row?.investmentType ?? dummy.investmentType,
      row?.developmentType ?? dummy.developmentType,
      `Code: ${row?.code ?? dummy.propertyCode}`,
    ];
    return parts.filter(Boolean).join(' · ');
  });

  readonly kpiCards = computed(() => kpiCardsFromAssetRow(this.listRow()));

  readonly flatBlocks = computed(() => {
    const state = this.detailState();
    return buildFlatAssetBlocks(
      state.detail,
      state.investments,
      this.kpiCards(),
      this.listRow(),
    );
  });

  readonly formatSquareFeet = formatSquareFeet;
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
      });

    const navigationState = (history.state ?? {}) as { assetRow?: AssetTableRow };
    if (navigationState.assetRow) {
      this.listRow.set(navigationState.assetRow);
    }

    this.destroyRef.onDestroy(() => {
      this.store.dispatch(AssetsApiActions.clearDetail());
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
          const top = main.scrollTop + (targetRect.top - mainRect.top);
          main.scrollTo({ top, behavior: 'smooth' });
        }
      }

      window.setTimeout(() => this.scrollSpyPaused.set(false), 800);
    });
  }

  backToList(): void {
    void this.router.navigate(['/capital-dashboard/asset']);
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
