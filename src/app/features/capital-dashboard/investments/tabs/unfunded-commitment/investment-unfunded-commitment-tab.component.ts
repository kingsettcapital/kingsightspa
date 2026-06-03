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
import { readFundPeriodsCache } from '../../../store/capital-dashboard-cache.util';
import { FundsApiActions } from '../../../store';
import { selectFunds, selectFundsDetail, selectFundsDetailSelectedKey } from '../../../store/capital-dashboard.selectors';
import { PortalSpinnerComponent } from '../../../shared/components/portal-spinner/portal-spinner.component';
import {
  dateKeyFromPeriodFilter,
  FundPeriodFilterValue,
  mapFundPeriodsToSelectOptions,
} from '../fund-period.util';
import { filterInvestmentDetailTabRows, sumInvestmentDetailTabRows } from '../investment-detail-tab.util';

@Component({
  selector: 'app-investment-unfunded-commitment-tab',
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
  templateUrl: './investment-unfunded-commitment-tab.component.html',
  styleUrl: './investment-unfunded-commitment-tab.component.scss',
})
export class InvestmentUnfundedCommitmentTabComponent {
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);
  readonly fundType = input('');

  readonly tabActive = input(false);

  private readonly funds = this.store.selectSignal(selectFunds);
  private readonly fundsDetail = this.store.selectSignal(selectFundsDetail);
  private readonly selectedFundKey = this.store.selectSignal(selectFundsDetailSelectedKey);

  private unfundedAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  readonly period = signal<FundPeriodFilterValue>('all');
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.fundsDetail().unfundedCommitmentsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const fundKey = this.selectedFundKey();
    if (!fundKey) return [];
    const cached = readFundPeriodsCache(
      this.funds().cache.periodLists,
      fundKey,
      'unfunded-commitments',
      this.timeframe(),
    );
    return mapFundPeriodsToSelectOptions(cached?.items);
  });

  readonly columns = computed(() =>
    this.isDaily() ? ['date', 'amount', 'units', 'description'] : ['period', 'amount', 'units', 'description'],
  );

  readonly rows = computed(() =>
    filterInvestmentDetailTabRows(this.fundsDetail().unfundedCommitments, this.searchQuery()),
  );
  readonly loading = computed(() => this.fundsDetail().unfundedCommitmentsLoading);
  readonly loadingMore = computed(() => this.fundsDetail().unfundedCommitmentsLoadingMore);
  readonly hasNextPage = computed(() => this.fundsDetail().unfundedCommitmentsHasNextPage);
  readonly error = computed(() => this.fundsDetail().unfundedCommitmentsError);

  readonly totalAmount = computed(() => sumInvestmentDetailTabRows(this.rows()).totalAmount);
  readonly totalUnits = computed(() => sumInvestmentDetailTabRows(this.rows()).totalUnits);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.unfundedAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const fundKey = this.selectedFundKey();
      const timeframe = this.timeframe();
      if (!fundKey) return;

      const periodsKey = `${fundKey}:unfunded-commitments:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            FundsApiActions.loadFundPeriods({ fundKey, source: 'unfunded-commitments', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${fundKey}:${timeframe}:${this.period()}`;
      if (this.unfundedAutoLoadKey === autoLoadKey) return;
      this.unfundedAutoLoadKey = autoLoadKey;

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
    this.period.set('all');
    this.unfundedAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.store.dispatch(
      FundsApiActions.loadFundUnfundedCommitmentsPage({
        fundKey,
        timeframe: value,
        page: 1,
        search: this.searchQuery(),
        replace: true,
      }),
    );
  }

  onPeriodChange(value: FundPeriodFilterValue): void {
    this.period.set(value);
    if (!this.tabActive()) return;
    const fundKey = this.selectedFundKey();
    if (!fundKey) return;
    this.unfundedAutoLoadKey = null;
    untracked(() => this.dispatchPage(1, true));
  }

  loadMore(): void {
    const detail = this.fundsDetail();
    if (
      detail.unfundedCommitmentsLoading ||
      detail.unfundedCommitmentsLoadingMore ||
      !detail.unfundedCommitmentsHasNextPage
    ) {
      return;
    }
    const fundKey = detail.selectedKey;
    if (!fundKey) return;
    this.dispatchPage(detail.unfundedCommitmentsPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: FundCommitmentTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundCommitmentTabRow) => r.period ?? '' };

    this.excelService.export<FundCommitmentTabRow>({
      filename: 'unfunded-commitment.xlsx',
      sheetName: 'Unfunded Commitment',
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
      FundsApiActions.loadFundUnfundedCommitmentsPage({
        fundKey,
        timeframe: detail.unfundedCommitmentsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
