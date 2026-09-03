import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of } from 'rxjs';

import { FundsListQueryParams } from '../../shared/models/api.models';
import { CapitalFundsApiService } from '../../shared/services/capital-funds-api.service';
import { mapFundListItemToActiveFundRow } from '../dashboard-active-table.util';
import { ActiveFundRow } from '../dashboard.mock-data';
import { formatCurrency } from '../../shared/utils/format-currency.util';

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
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly subtitleText = computed(() => {
    const count = this.totalCount();
    return `${count} fund${count === 1 ? '' : 's'} under management`;
  });

  readonly totalEum = computed(() => {
    const sum = this.rows().reduce((total, row) => total + row.eumAmount, 0);
    return formatCurrency(sum, { compact: true });
  });

  constructor() {
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
    };

    this.fundsApi
      .getAllFunds(params)
      .pipe(
        catchError(() => {
          this.error.set('Unable to load active funds.');
          return of(null);
        }),
      )
      .subscribe((items) => {
        this.loading.set(false);
        if (!items) {
          this.rows.set([]);
          this.totalCount.set(0);
          return;
        }

        this.rows.set(items.map((item, index) => mapFundListItemToActiveFundRow(item, index)));
        this.totalCount.set(items.length);
      });
  }
}
