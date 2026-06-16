import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { FundsListQueryParams } from '../../shared/models/api.models';
import { CapitalFundsApiService } from '../../shared/services/capital-funds-api.service';
import {
  EMPTY_FUNDS_FILTER_OPTIONS,
  FundsFilterOptions,
  normalizeFundsFilterOptions,
} from '../../shared/utils/fund-filter-options.util';
import { mapFundListItemToActiveFundRow } from '../dashboard-active-table.util';
import { ActiveFundRow, DashboardPeriod } from '../dashboard.mock-data';

const DASHBOARD_FUNDS_PAGE_SIZE = 5;

@Component({
  selector: 'app-active-funds-table',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './active-funds-table.component.html',
  styleUrl: './active-funds-table.component.scss',
})
export class ActiveFundsTableComponent {
  private readonly fundsApi = inject(CapitalFundsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<ActiveFundRow[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly period = signal<DashboardPeriod>('ltd');
  readonly filterOptions = signal<FundsFilterOptions>(EMPTY_FUNDS_FILTER_OPTIONS);

  readonly subtitleText = computed(() => {
    const count = this.totalCount();
    return `${count} fund${count === 1 ? '' : 's'} under management`;
  });

  constructor() {
    this.fundsApi
      .getFilterOptions()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.filterOptions.set(normalizeFundsFilterOptions(response));
      });

    this.loadFunds();
  }

  setPeriod(value: DashboardPeriod): void {
    if (this.period() === value) {
      return;
    }
    this.period.set(value);
    this.loadFunds();
  }

  retryLoad(): void {
    this.loadFunds();
  }

  private loadFunds(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: FundsListQueryParams = {
      view: this.period(),
      page: 1,
      pageSize: DASHBOARD_FUNDS_PAGE_SIZE,
    };

    if (this.period() === 'quarterly') {
      const latestPeriod = this.filterOptions().quarterlyPeriods[0];
      const dateKey = latestPeriod?.dateKey;
      if (dateKey != null) {
        params.dateKey = dateKey;
      }
    }

    this.fundsApi
      .getFunds(params)
      .pipe(
        catchError(() => {
          this.error.set('Unable to load active funds.');
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
        this.rows.set(items.map((item, index) => mapFundListItemToActiveFundRow(item, index)));
        this.totalCount.set(response.totalCount ?? items.length);
      });
  }
}
