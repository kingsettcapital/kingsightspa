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
  filterInvestmentAmountTabRows,
  investmentAmountTableColumns,
  sumInvestmentAmountTabRows,
} from '../investor-detail-tab.util';

@Component({
  selector: 'app-investor-unfunded-commitment-tab',
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
  templateUrl: './investor-unfunded-commitment-tab.component.html',
  styleUrl: './investor-unfunded-commitment-tab.component.scss',
})
export class InvestorUnfundedCommitmentTabComponent {
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);
  readonly tabActive = input(false);

  private readonly funds = this.store.selectSignal(selectInvestors);
  private readonly investorsDetail = this.store.selectSignal(selectInvestorsDetail);
  private readonly selectedInvestorKey = this.store.selectSignal(selectInvestorsDetailSelectedKey);

  private unfundedAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  private readonly periodByTimeframe = signal<FundPeriodByTimeframe>({});
  readonly period = computed(() => periodForTimeframe(this.periodByTimeframe(), this.timeframe()));
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.investorsDetail().unfundedCommitmentsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return [];
    const cached = readInvestorPeriodsCache(
      this.funds().cache.periodLists,
      investorKey,
      'unfunded-commitments',
      this.timeframe(),
    );
    return mapFundPeriodsToSelectOptions(cached?.items);
  });

  readonly columns = computed(() => investmentAmountTableColumns(this.isDaily()));

  readonly rows = computed(() =>
    filterInvestmentAmountTabRows(this.investorsDetail().unfundedCommitments, this.searchQuery()),
  );
  readonly loading = computed(() => this.investorsDetail().unfundedCommitmentsLoading);
  readonly loadingMore = computed(() => this.investorsDetail().unfundedCommitmentsLoadingMore);
  readonly hasNextPage = computed(() => this.investorsDetail().unfundedCommitmentsHasNextPage);
  readonly error = computed(() => this.investorsDetail().unfundedCommitmentsError);

  readonly totalAmount = computed(() => sumInvestmentAmountTabRows(this.rows()).totalAmount);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.unfundedAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const investorKey = this.selectedInvestorKey();
      const timeframe = this.timeframe();
      if (!investorKey) return;

      const periodsKey = `${investorKey}:unfunded-commitments:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            InvestorsApiActions.loadInvestorPeriods({ investorKey, source: 'unfunded-commitments', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${investorKey}:${timeframe}:${this.period()}`;
      if (this.unfundedAutoLoadKey === autoLoadKey) return;
      this.unfundedAutoLoadKey = autoLoadKey;

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
    this.unfundedAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.store.dispatch(
      InvestorsApiActions.loadInvestorUnfundedCommitmentsPage({
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
    this.unfundedAutoLoadKey = null;
    untracked(() => this.dispatchPage(1, true));
  }

  loadMore(): void {
    const detail = this.investorsDetail();
    if (
      detail.unfundedCommitmentsLoading ||
      detail.unfundedCommitmentsLoadingMore ||
      !detail.unfundedCommitmentsHasNextPage
    ) {
      return;
    }
    const investorKey = detail.selectedKey;
    if (!investorKey) return;
    this.dispatchPage(detail.unfundedCommitmentsPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: FundAmountTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundAmountTabRow) => r.period ?? '' };

    this.excelService.export<FundAmountTabRow>({
      filename: 'unfunded-commitment.xlsx',
      sheetName: 'Unfunded Commitment',
      columns: [
        periodColumn,
        { header: 'Amount', value: (r) => r.amount },
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
      InvestorsApiActions.loadInvestorUnfundedCommitmentsPage({
        investorKey,
        timeframe: detail.unfundedCommitmentsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
