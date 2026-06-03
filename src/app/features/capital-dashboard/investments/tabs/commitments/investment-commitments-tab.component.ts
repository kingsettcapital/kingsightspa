import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { KsCurrencyPipe } from '../../../../../shared/pipes/ks-currency.pipe';
import { ExcelService } from '../../../../../core/services/excel.service';
import { FundCommitmentTabRow, FundCommitmentTimeframe } from '../../../shared/models/api.models';
import { FundsApiActions } from '../../../store';
import { selectFundsDetail, selectFundsDetailSelectedKey } from '../../../store/capital-dashboard.selectors';
import { PortalSpinnerComponent } from '../../../shared/components/portal-spinner/portal-spinner.component';
import { sumInvestmentDetailTabRows } from '../investment-detail-tab.util';

@Component({
  selector: 'app-investment-commitments-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
    DecimalPipe,
    KsCurrencyPipe,
    PortalSpinnerComponent,
  ],
  templateUrl: './investment-commitments-tab.component.html',
  styleUrl: './investment-commitments-tab.component.scss',
})
export class InvestmentCommitmentsTabComponent {
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);

  /** True when the Commitments mat-tab is selected (lazy-load gate). */
  readonly tabActive = input(false);

  private readonly fundsDetail = this.store.selectSignal(selectFundsDetail);
  private readonly selectedFundKey = this.store.selectSignal(selectFundsDetailSelectedKey);

  /** Prevents the tab-activate effect from re-firing on every commitments state update. */
  private commitmentsAutoLoadKey: string | null = null;

  readonly period = signal<'all'>('all');
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.fundsDetail().commitmentsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly columns = computed(() =>
    this.isDaily() ? ['date', 'amount', 'units', 'description'] : ['period', 'amount', 'units', 'description'],
  );

  readonly rows = computed(() => this.fundsDetail().commitments);
  readonly loading = computed(() => this.fundsDetail().commitmentsLoading);
  readonly loadingMore = computed(() => this.fundsDetail().commitmentsLoadingMore);
  readonly hasNextPage = computed(() => this.fundsDetail().commitmentsHasNextPage);
  readonly error = computed(() => this.fundsDetail().commitmentsError);

  readonly totalAmount = computed(() => sumInvestmentDetailTabRows(this.rows()).totalAmount);
  readonly totalUnits = computed(() => sumInvestmentDetailTabRows(this.rows()).totalUnits);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.commitmentsAutoLoadKey = null;
        return;
      }
      const fundKey = this.selectedFundKey();
      if (!fundKey) return;

      const autoLoadKey = `${fundKey}`;
      if (this.commitmentsAutoLoadKey === autoLoadKey) return;
      this.commitmentsAutoLoadKey = autoLoadKey;

      untracked(() => this.dispatchPage(1, true));
    });

    toObservable(this.searchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        if (!this.tabActive()) return;
        const fundKey = this.selectedFundKey();
        if (!fundKey) return;
        untracked(() => this.dispatchPage(1, true));
      });
  }

  onTimeframeChange(value: FundCommitmentTimeframe): void {
    if (!this.tabActive()) return;
    const fundKey = this.selectedFundKey();
    if (!fundKey) return;
    this.commitmentsAutoLoadKey = `${fundKey}:${value}`;
    this.store.dispatch(
      FundsApiActions.loadFundCommitmentsPage({
        fundKey,
        timeframe: value,
        page: 1,
        search: this.searchQuery(),
        replace: true,
      }),
    );
  }

  loadMore(): void {
    const detail = this.fundsDetail();
    if (detail.commitmentsLoading || detail.commitmentsLoadingMore || !detail.commitmentsHasNextPage) return;
    const fundKey = detail.selectedKey;
    if (!fundKey) return;
    this.dispatchPage(detail.commitmentsPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: FundCommitmentTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundCommitmentTabRow) => r.period ?? '' };

    this.excelService.export<FundCommitmentTabRow>({
      filename: 'commitments.xlsx',
      sheetName: 'Commitments',
      columns: [
        periodColumn,
        { header: 'Amount', value: (r) => r.amount },
        { header: 'Units', value: (r) => r.units },
        { header: 'Description', value: (r) => r.description },
      ],
      rows: exportRows,
    });
  }

  private dispatchPage(page: number, replace: boolean): void {
    const detail = this.fundsDetail();
    const fundKey = detail.selectedKey;
    if (!fundKey) return;

    this.store.dispatch(
      FundsApiActions.loadFundCommitmentsPage({
        fundKey,
        timeframe: detail.commitmentsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
      }),
    );
  }
}
