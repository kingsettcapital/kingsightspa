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
import {
  FundCommitmentTimeframe,
  FundDistributionPeriodTabRow,
} from '../../../shared/models/api.models';
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
  filterFundDistributionGroups,
  flattenFundDistributionGroupsForExport,
  sumFundDistributionGroups,
} from './fund-distribution.mapper';
import {
  investmentDetailTableColumns,
  isNegativeTabUnits,
  isUnitizedFundType,
} from '../investment-detail-tab.util';

export type DistributionTableRow =
  | {
      kind: 'group';
      groupKey: string;
      transactionType: string;
      totalAmount: number;
      totalUnits: string;
    }
  | ({
      kind: 'detail';
      groupKey: string;
    } & FundDistributionPeriodTabRow);

@Component({
  selector: 'app-investment-distributions-tab',
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
  templateUrl: './investment-distributions-tab.component.html',
  styleUrl: './investment-distributions-tab.component.scss',
})
export class InvestmentDistributionsTabComponent {
  protected readonly isNegativeTabUnits = isNegativeTabUnits;

  readonly fundType = input('');
  readonly isUnitized = computed(() => isUnitizedFundType(this.fundType()));
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);

  readonly tabActive = input(false);

  private readonly funds = this.store.selectSignal(selectFunds);
  private readonly fundsDetail = this.store.selectSignal(selectFundsDetail);
  private readonly selectedFundKey = this.store.selectSignal(selectFundsDetailSelectedKey);

  private distributionsAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  private readonly periodByTimeframe = signal<FundPeriodByTimeframe>({});
  private readonly collapsedGroupKeys = signal<ReadonlySet<string>>(new Set());

  readonly period = computed(() => periodForTimeframe(this.periodByTimeframe(), this.timeframe()));
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.fundsDetail().fundDistributionsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const fundKey = this.selectedFundKey();
    if (!fundKey) return [];
    const cached = readFundPeriodsCache(
      this.funds().cache.periodLists,
      fundKey,
      'distributions',
      this.timeframe(),
    );
    return mapFundPeriodsToSelectOptions(cached?.items);
  });

  readonly columns = computed(() => {
    const base = investmentDetailTableColumns(this.isDaily(), this.fundType());
    return ['expand', ...base];
  });

  readonly groups = computed(() =>
    filterFundDistributionGroups(this.fundsDetail().fundDistributions, this.searchQuery()),
  );

  readonly displayRows = computed((): DistributionTableRow[] => {
    const collapsed = this.collapsedGroupKeys();
    const rows: DistributionTableRow[] = [];

    for (const group of this.groups()) {
      rows.push({
        kind: 'group',
        groupKey: group.groupKey,
        transactionType: group.transactionType,
        totalAmount: group.totalAmount,
        totalUnits: group.totalUnits,
      });

      if (!collapsed.has(group.groupKey)) {
        for (const period of group.periods) {
          rows.push({
            kind: 'detail',
            groupKey: group.groupKey,
            ...period,
          });
        }
      }
    }

    return rows;
  });

  readonly loading = computed(() => this.fundsDetail().fundDistributionsLoading);
  readonly loadingMore = computed(() => this.fundsDetail().fundDistributionsLoadingMore);
  readonly hasNextPage = computed(() => this.fundsDetail().fundDistributionsHasNextPage);
  readonly error = computed(() => this.fundsDetail().fundDistributionsError);

  readonly totalAmount = computed(() => sumFundDistributionGroups(this.groups()).totalAmount);
  readonly totalUnits = computed(() => sumFundDistributionGroups(this.groups()).totalUnits);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.distributionsAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const fundKey = this.selectedFundKey();
      const timeframe = this.timeframe();
      if (!fundKey) return;

      const periodsKey = `${fundKey}:distributions:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            FundsApiActions.loadFundPeriods({ fundKey, source: 'distributions', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${fundKey}:${timeframe}:${this.period()}`;
      if (this.distributionsAutoLoadKey === autoLoadKey) return;
      this.distributionsAutoLoadKey = autoLoadKey;

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

  isGroupRow(row: DistributionTableRow): row is Extract<DistributionTableRow, { kind: 'group' }> {
    return row.kind === 'group';
  }

  isDetailRow(row: DistributionTableRow): row is Extract<DistributionTableRow, { kind: 'detail' }> {
    return row.kind === 'detail';
  }

  isGroupExpanded(groupKey: string): boolean {
    return !this.collapsedGroupKeys().has(groupKey);
  }

  toggleGroup(groupKey: string, event?: Event): void {
    event?.stopPropagation();
    this.collapsedGroupKeys.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  onTimeframeChange(value: FundCommitmentTimeframe): void {
    if (!this.tabActive()) return;
    const fundKey = this.selectedFundKey();
    if (!fundKey) return;
    this.distributionsAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.resetCollapsedGroups();
    this.store.dispatch(
      FundsApiActions.loadFundDistributionsPage({
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
    this.distributionsAutoLoadKey = null;
    this.resetCollapsedGroups();
    untracked(() => this.dispatchPage(1, true));
  }

  loadMore(): void {
    const detail = this.fundsDetail();
    if (
      detail.fundDistributionsLoading ||
      detail.fundDistributionsLoadingMore ||
      !detail.fundDistributionsHasNextPage
    ) {
      return;
    }
    const fundKey = detail.selectedKey;
    if (!fundKey) return;
    this.dispatchPage(detail.fundDistributionsPage + 1, false);
  }

  downloadExcel(): void {
    const exportRows = flattenFundDistributionGroupsForExport(this.groups());
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: (typeof exportRows)[number]) => r.date ?? '' }
      : { header: 'Period', value: (r: (typeof exportRows)[number]) => r.period ?? '' };

    this.excelService.export({
      filename: 'distributions.xlsx',
      sheetName: 'Distributions',
      columns: [
        { header: 'Transaction Type', value: (r) => r.transactionType },
        periodColumn,
        { header: 'Amount', value: (r) => r.amount },
        { header: 'Units', value: (r) => r.units },
        { header: 'Description', value: (r) => r.description },
      ],
      rows: exportRows,
    });
  }

  private resetCollapsedGroups(): void {
    this.collapsedGroupKeys.set(new Set());
  }

  private dispatchPage(page: number, replace: boolean): void {
    const detail = this.fundsDetail();
    const fundKey = detail.selectedKey;
    if (!fundKey) return;

    if (replace) {
      this.resetCollapsedGroups();
    }

    this.store.dispatch(
      FundsApiActions.loadFundDistributionsPage({
        fundKey,
        timeframe: detail.fundDistributionsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
