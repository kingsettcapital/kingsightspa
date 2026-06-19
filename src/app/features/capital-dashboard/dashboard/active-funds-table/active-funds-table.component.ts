import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { FundsListQueryParams } from '../../shared/models/api.models';
import { CapitalFundsApiService } from '../../shared/services/capital-funds-api.service';
import { mapFundListItemToActiveFundRow } from '../dashboard-active-table.util';
import { ActiveFundRow } from '../dashboard.mock-data';

const DASHBOARD_FUNDS_PAGE_SIZE = 10;
const VISIBLE_PAGE_BUTTON_COUNT = 5;

@Component({
  selector: 'app-active-funds-table',
  standalone: true,
  imports: [RouterModule, MatIconModule],
  templateUrl: './active-funds-table.component.html',
  styleUrl: './active-funds-table.component.scss',
})
export class ActiveFundsTableComponent {
  private readonly fundsApi = inject(CapitalFundsApiService);

  readonly rows = signal<ActiveFundRow[]>([]);
  readonly totalCount = signal(0);
  readonly totalPages = signal(1);
  readonly currentPage = signal(1);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly subtitleText = computed(() => {
    const count = this.totalCount();
    return `${count} fund${count === 1 ? '' : 's'} under management`;
  });

  readonly pageNumbers = computed(() => {
    const totalPages = this.totalPages();
    const currentPage = this.currentPage();

    if (totalPages <= VISIBLE_PAGE_BUTTON_COUNT) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let start = Math.max(1, currentPage - 1);
    if (start + VISIBLE_PAGE_BUTTON_COUNT - 1 > totalPages) {
      start = totalPages - VISIBLE_PAGE_BUTTON_COUNT + 1;
    }

    return Array.from({ length: VISIBLE_PAGE_BUTTON_COUNT }, (_, index) => start + index);
  });

  readonly showingFrom = computed(() =>
    this.totalCount() === 0 ? 0 : (this.currentPage() - 1) * DASHBOARD_FUNDS_PAGE_SIZE + 1,
  );

  readonly showingTo = computed(() =>
    Math.min(this.currentPage() * DASHBOARD_FUNDS_PAGE_SIZE, this.totalCount()),
  );

  constructor() {
    this.loadFunds();
  }

  // setPeriod(value: DashboardPeriod): void {
  //   if (this.period() === value) {
  //     return;
  //   }
  //   this.period.set(value);
  //   this.currentPage.set(1);
  //   this.loadFunds();
  // }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.currentPage.set(page);
    this.loadFunds();
  }

  retryLoad(): void {
    this.loadFunds();
  }

  private loadFunds(): void {
    this.loading.set(true);
    this.error.set(null);

    const params: FundsListQueryParams = {
      view: 'ltd',
      page: this.currentPage(),
      pageSize: DASHBOARD_FUNDS_PAGE_SIZE,
    };

    this.fundsApi
      .getFunds(params)
      .pipe(
        catchError(() => {
          this.error.set('Unable to load active funds.');
          return of(null);
        }),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (!response) {
          this.rows.set([]);
          this.totalCount.set(0);
          this.totalPages.set(1);
          return;
        }

        const items = response.items ?? [];
        const page = response.page ?? this.currentPage();
        const pageOffset = (page - 1) * DASHBOARD_FUNDS_PAGE_SIZE;
        this.rows.set(
          items.map((item, index) => mapFundListItemToActiveFundRow(item, pageOffset + index)),
        );
        this.totalCount.set(response.totalCount ?? items.length);
        this.totalPages.set(Math.max(1, response.totalPages ?? 1));
        this.currentPage.set(page);
      });
  }
}
