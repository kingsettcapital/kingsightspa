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
import { FundNavTabRow, FundNavTimeframe } from '../../../shared/models/api.models';
import { FundsApiActions } from '../../../store';
import { selectFundsDetail, selectFundsDetailSelectedKey } from '../../../store/capital-dashboard.selectors';
import { PortalSpinnerComponent } from '../../../shared/components/portal-spinner/portal-spinner.component';
import { sumInvestmentDetailTabRows } from '../investment-detail-tab.util';

@Component({
  selector: 'app-investment-nav-tab',
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
  templateUrl: './investment-nav-tab.component.html',
  styleUrl: './investment-nav-tab.component.scss',
})
export class InvestmentNavTabComponent {
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);

  /** True when the NAV mat-tab is selected (lazy-load gate). */
  readonly tabActive = input(false);

  private readonly fundsDetail = this.store.selectSignal(selectFundsDetail);
  private readonly selectedFundKey = this.store.selectSignal(selectFundsDetailSelectedKey);

  private navAutoLoadKey: string | null = null;

  readonly period = signal<'all'>('all');
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.fundsDetail().navTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly columns = computed(() =>
    this.isDaily() ? ['date', 'amount', 'units', 'description'] : ['period', 'amount', 'units', 'description'],
  );

  readonly rows = computed(() => this.fundsDetail().nav);
  readonly loading = computed(() => this.fundsDetail().navLoading);
  readonly loadingMore = computed(() => this.fundsDetail().navLoadingMore);
  readonly hasNextPage = computed(() => this.fundsDetail().navHasNextPage);
  readonly error = computed(() => this.fundsDetail().navError);

  readonly totalAmount = computed(() => sumInvestmentDetailTabRows(this.rows()).totalAmount);
  readonly totalUnits = computed(() => sumInvestmentDetailTabRows(this.rows()).totalUnits);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.navAutoLoadKey = null;
        return;
      }
      const fundKey = this.selectedFundKey();
      if (!fundKey) return;

      const autoLoadKey = `${fundKey}`;
      if (this.navAutoLoadKey === autoLoadKey) return;
      this.navAutoLoadKey = autoLoadKey;

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

  onTimeframeChange(value: FundNavTimeframe): void {
    if (!this.tabActive()) return;
    const fundKey = this.selectedFundKey();
    if (!fundKey) return;
    this.navAutoLoadKey = `${fundKey}:${value}`;
    this.store.dispatch(
      FundsApiActions.loadFundNavPage({
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
    if (detail.navLoading || detail.navLoadingMore || !detail.navHasNextPage) return;
    const fundKey = detail.selectedKey;
    if (!fundKey) return;
    this.dispatchPage(detail.navPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: FundNavTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: FundNavTabRow) => r.period ?? '' };

    this.excelService.export<FundNavTabRow>({
      filename: 'nav.xlsx',
      sheetName: 'NAV',
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
      FundsApiActions.loadFundNavPage({
        fundKey,
        timeframe: detail.navTimeframe,
        page,
        search: this.searchQuery(),
        replace,
      }),
    );
  }
}
