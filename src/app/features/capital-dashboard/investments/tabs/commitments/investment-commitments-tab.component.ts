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
import { FundAmountTabRow, FundCommitmentTimeframe } from '../../../shared/models/api.models';
import { readFundPeriodsCache } from '../../../store/capital-dashboard-cache.util';
import { FundsApiActions } from '../../../store';
import { selectFunds, selectFundsDetail, selectFundsDetailSelectedKey } from '../../../store/capital-dashboard.selectors';
import { PortalSpinnerComponent } from '../../../shared/components/portal-spinner/portal-spinner.component';
import {
  dateKeyFromPeriodFilter,
  FundPeriodByTimeframe,
  FundPeriodFilterValue,
  mapFundPeriodsToSelectOptions,
  periodForTimeframe,
  setPeriodForTimeframe,
} from '../fund-period.util';
import {
  filterInvestmentAmountTabRows,
  investmentAmountTableColumns,
  sumInvestmentAmountTabRows,
} from '../investment-detail-tab.util';

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

  private readonly funds = this.store.selectSignal(selectFunds);
  private readonly fundsDetail = this.store.selectSignal(selectFundsDetail);
  private readonly selectedFundKey = this.store.selectSignal(selectFundsDetailSelectedKey);

  private commitmentsAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  private readonly periodByTimeframe = signal<FundPeriodByTimeframe>({});
  readonly period = computed(() => periodForTimeframe(this.periodByTimeframe(), this.timeframe()));
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.fundsDetail().commitmentsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const fundKey = this.selectedFundKey();
    if (!fundKey) return [];
    const cached = readFundPeriodsCache(
      this.funds().cache.periodLists,
      fundKey,
      'commitments',
      this.timeframe(),
    );
    return mapFundPeriodsToSelectOptions(cached?.items);
  });

  readonly columns = computed(() => investmentAmountTableColumns(this.isDaily()));

  readonly rows = computed(() =>
    filterInvestmentAmountTabRows(this.fundsDetail().commitments, this.searchQuery()),
  );
  readonly loading = computed(() => this.fundsDetail().commitmentsLoading);
  readonly loadingMore = computed(() => this.fundsDetail().commitmentsLoadingMore);
  readonly hasNextPage = computed(() => this.fundsDetail().commitmentsHasNextPage);
  readonly error = computed(() => this.fundsDetail().commitmentsError);

  readonly totalAmount = computed(() => sumInvestmentAmountTabRows(this.rows()).totalAmount);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.commitmentsAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const fundKey = this.selectedFundKey();
      const timeframe = this.timeframe();
      if (!fundKey) return;

      const periodsKey = `${fundKey}:commitments:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            FundsApiActions.loadFundPeriods({ fundKey, source: 'commitments', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${fundKey}:${timeframe}:${this.period()}`;
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
    this.commitmentsAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.store.dispatch(
      FundsApiActions.loadFundCommitmentsPage({
        fundKey,
        timeframe: value,
        page: 1,
        search: this.searchQuery(),
        replace: true,
        dateKey: dateKeyFromPeriodFilter(periodForTimeframe(this.periodByTimeframe(), value)),
      }),
    );
  }

  onPeriodChange(value: FundPeriodFilterValue): void {
    this.periodByTimeframe.update((m) => setPeriodForTimeframe(m, this.timeframe(), value));
    if (!this.tabActive()) return;
    const fundKey = this.selectedFundKey();
    if (!fundKey) return;
    this.commitmentsAutoLoadKey = null;
    untracked(() => this.dispatchPage(1, true));
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
      ? { header: 'Date', value: (r: FundAmountTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundAmountTabRow) => r.period ?? '' };

    this.excelService.export<FundAmountTabRow>({
      filename: 'commitments.xlsx',
      sheetName: 'Commitments',
      columns: [
        periodColumn,
        { header: 'Amount', value: (r) => r.amount },
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
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
