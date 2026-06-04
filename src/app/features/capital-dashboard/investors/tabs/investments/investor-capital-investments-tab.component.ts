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
import { readInvestorPeriodsCache } from '../../../store/capital-dashboard-cache.util';
import { InvestorsApiActions } from '../../../store';
import { selectInvestors, selectInvestorsDetail, selectInvestorsDetailSelectedKey } from '../../../store/capital-dashboard.selectors';
import { PortalSpinnerComponent } from '../../../shared/components/portal-spinner/portal-spinner.component';
import {
  dateKeyFromPeriodFilter,
  FundPeriodByTimeframe,
  FundPeriodFilterValue,
  mapFundPeriodsToSelectOptions,
  periodForTimeframe,
  setPeriodForTimeframe,
} from '../investor-period.util';
import {
  filterInvestmentDetailTabRows,
  investmentFundInvestmentsTableColumns,
  sumInvestmentAmountTabRows,
} from '../investor-detail-tab.util';

@Component({
  selector: 'app-investor-capital-investments-tab',
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
  templateUrl: './investor-capital-investments-tab.component.html',
  styleUrl: './investor-capital-investments-tab.component.scss',
})
export class InvestorCapitalInvestmentsTabComponent {
  readonly fundType = input('');
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);

  readonly tabActive = input(false);

  private readonly funds = this.store.selectSignal(selectInvestors);
  private readonly investorsDetail = this.store.selectSignal(selectInvestorsDetail);
  private readonly selectedInvestorKey = this.store.selectSignal(selectInvestorsDetailSelectedKey);

  private investmentsAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  private readonly periodByTimeframe = signal<FundPeriodByTimeframe>({});
  readonly period = computed(() => periodForTimeframe(this.periodByTimeframe(), this.timeframe()));
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.investorsDetail().capitalInvestmentsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return [];
    const cached = readInvestorPeriodsCache(
      this.funds().cache.periodLists,
      investorKey,
      'investments',
      this.timeframe(),
    );
    return mapFundPeriodsToSelectOptions(cached?.items);
  });

  readonly columns = computed(() => investmentFundInvestmentsTableColumns(this.isDaily()));

  readonly rows = computed(() =>
    filterInvestmentDetailTabRows(this.investorsDetail().capitalInvestments, this.searchQuery()),
  );
  readonly loading = computed(() => this.investorsDetail().capitalInvestmentsLoading);
  readonly loadingMore = computed(() => this.investorsDetail().capitalInvestmentsLoadingMore);
  readonly hasNextPage = computed(() => this.investorsDetail().capitalInvestmentsHasNextPage);
  readonly error = computed(() => this.investorsDetail().capitalInvestmentsError);

  readonly totalAmount = computed(() => sumInvestmentAmountTabRows(this.rows()).totalAmount);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.investmentsAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const investorKey = this.selectedInvestorKey();
      const timeframe = this.timeframe();
      if (!investorKey) return;

      const periodsKey = `${investorKey}:investments:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            InvestorsApiActions.loadInvestorPeriods({ investorKey, source: 'investments', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${investorKey}:${timeframe}:${this.period()}`;
      if (this.investmentsAutoLoadKey === autoLoadKey) return;
      this.investmentsAutoLoadKey = autoLoadKey;

      untracked(() => this.dispatchPage(1, true));
    });

    toObservable(this.searchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => {
        if (!this.tabActive()) return;
        const investorKey = this.selectedInvestorKey();
        if (!investorKey) return;
        untracked(() => this.dispatchPage(1, true));
      });
  }

  onTimeframeChange(value: FundCommitmentTimeframe): void {
    if (!this.tabActive()) return;
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return;
    this.investmentsAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.store.dispatch(
      InvestorsApiActions.loadInvestorCapitalInvestmentsPage({
        investorKey,
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
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return;
    this.investmentsAutoLoadKey = null;
    untracked(() => this.dispatchPage(1, true));
  }

  loadMore(): void {
    const detail = this.investorsDetail();
    if (detail.capitalInvestmentsLoading || detail.capitalInvestmentsLoadingMore || !detail.capitalInvestmentsHasNextPage) {
      return;
    }
    const investorKey = detail.selectedKey;
    if (!investorKey) return;
    this.dispatchPage(detail.capitalInvestmentsPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: FundCommitmentTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundCommitmentTabRow) => r.period ?? '' };

    this.excelService.export<FundCommitmentTabRow>({
      filename: 'investments.xlsx',
      sheetName: 'Investments',
      columns: [
        { header: 'Fund Code', value: (r) => r.fundCode ?? '' },
        periodColumn,
        { header: 'Invested Amount', value: (r) => r.amount },
        { header: 'Description', value: (r) => r.description },
      ],
      rows: exportRows,
    });
  }

  private dispatchPage(page: number, replace: boolean): void {
    const detail = this.investorsDetail();
    const investorKey = detail.selectedKey;
    if (!investorKey) return;

    this.store.dispatch(
      InvestorsApiActions.loadInvestorCapitalInvestmentsPage({
        investorKey,
        timeframe: detail.capitalInvestmentsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
