import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { AssetsQueryParams } from '../../shared/models/api.models';
import { CapitalAssetsApiService } from '../../shared/services/capital-assets-api.service';
import { mapPropertyListItemToActiveAssetRow } from '../dashboard-active-table.util';
import { ActiveAssetRow } from '../dashboard.mock-data';

const DASHBOARD_ASSETS_PAGE_SIZE = 5;

@Component({
  selector: 'app-active-assets-table',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './active-assets-table.component.html',
  styleUrl: './active-assets-table.component.scss',
})
export class ActiveAssetsTableComponent {
  private readonly assetsApi = inject(CapitalAssetsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<ActiveAssetRow[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly subtitleText = computed(() => {
    const count = this.totalCount();
    return `${count} propert${count === 1 ? 'y' : 'ies'} in portfolio`;
  });

  constructor() {
    this.loadAssets();
  }

  retryLoad(): void {
    this.loadAssets();
  }

  private loadAssets(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: AssetsQueryParams = {
      page: 1,
      pageSize: DASHBOARD_ASSETS_PAGE_SIZE,
    };

    this.assetsApi
      .getAssets(params)
      .pipe(
        catchError(() => {
          this.error.set('Unable to load active assets.');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (!response) {
          this.rows.set([]);
          this.totalCount.set(0);
          return;
        }

        const items = response.items ?? [];
        this.rows.set(items.map((item, index) => mapPropertyListItemToActiveAssetRow(item, index)));
        this.totalCount.set(response.totalCount ?? items.length);
      });
  }
}
