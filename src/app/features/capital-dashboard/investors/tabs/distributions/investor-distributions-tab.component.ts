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
  filterFundDistributionGroups,
  flattenFundDistributionGroupsForExport,
  sumFundDistributionGroups,
} from './investor-distribution.mapper';
import {
  investmentDetailTableColumns,
  isNegativeTabUnits,
  isUnitizedFundType,
} from '../investor-detail-tab.util';

export type DistributionTableRow =
  | {
      kind: 'group';
      groupKey: string;
      fundCode: string;
      transactionType: string;
      totalAmount: number;
      totalUnits: string;
    }
  | ({
      kind: 'detail';
      groupKey: string;
      fundCode: string;
    } & FundDistributionPeriodTabRow);

@Component({
  selector: 'app-investor-distributions-tab',
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
  templateUrl: './investor-distributions-tab.component.html',
  styleUrl: './investor-distributions-tab.component.scss',
})
export class InvestorDistributionsTabComponent {
  protected readonly isNegativeTabUnits = isNegativeTabUnits;

  readonly fundType = input('');
  readonly isUnitized = computed(() => isUnitizedFundType(this.fundType()));
  private readonly excelService = inject(ExcelService);
  private readonly store = inject(Store);

  readonly tabActive = input(false);

  private readonly funds = this.store.selectSignal(selectInvestors);
  private readonly investorsDetail = this.store.selectSignal(selectInvestorsDetail);
  private readonly selectedInvestorKey = this.store.selectSignal(selectInvestorsDetailSelectedKey);

  private distributionsAutoLoadKey: string | null = null;
  private periodsLoadKey: string | null = null;

  private readonly periodByTimeframe = signal<FundPeriodByTimeframe>({});
  private readonly collapsedGroupKeys = signal<ReadonlySet<string>>(new Set());

  readonly period = computed(() => periodForTimeframe(this.periodByTimeframe(), this.timeframe()));
  readonly searchQuery = signal('');

  readonly timeframe = computed(() => this.investorsDetail().investorDistributionsTimeframe);
  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly periodOptions = computed(() => {
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return [];
    const cached = readInvestorPeriodsCache(
      this.funds().cache.periodLists,
      investorKey,
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
    filterFundDistributionGroups(this.investorsDetail().investorDistributions, this.searchQuery()),
  );

  readonly displayRows = computed((): DistributionTableRow[] => {
    const collapsed = this.collapsedGroupKeys();
    const rows: DistributionTableRow[] = [];

    for (const group of this.groups()) {
      rows.push({
        kind: 'group',
        groupKey: group.groupKey,
        fundCode: group.fundCode,
        transactionType: group.transactionType,
        totalAmount: group.totalAmount,
        totalUnits: group.totalUnits,
      });

      if (!collapsed.has(group.groupKey)) {
        for (const period of group.periods) {
          rows.push({
            kind: 'detail',
            groupKey: group.groupKey,
            fundCode: group.fundCode,
            ...period,
          });
        }
      }
    }

    return rows;
  });

  readonly loading = computed(() => this.investorsDetail().investorDistributionsLoading);
  readonly loadingMore = computed(() => this.investorsDetail().investorDistributionsLoadingMore);
  readonly hasNextPage = computed(() => this.investorsDetail().investorDistributionsHasNextPage);
  readonly error = computed(() => this.investorsDetail().investorDistributionsError);

  readonly totalAmount = computed(() => sumFundDistributionGroups(this.groups()).totalAmount);
  readonly totalUnits = computed(() => sumFundDistributionGroups(this.groups()).totalUnits);

  constructor() {
    effect(() => {
      if (!this.tabActive()) {
        this.distributionsAutoLoadKey = null;
        this.periodsLoadKey = null;
        return;
      }
      const investorKey = this.selectedInvestorKey();
      const timeframe = this.timeframe();
      if (!investorKey) return;

      const periodsKey = `${investorKey}:distributions:${timeframe}`;
      if (this.periodsLoadKey !== periodsKey) {
        this.periodsLoadKey = periodsKey;
        untracked(() =>
          this.store.dispatch(
            InvestorsApiActions.loadInvestorPeriods({ investorKey, source: 'distributions', view: timeframe }),
          ),
        );
      }

      const autoLoadKey = `${investorKey}:${timeframe}:${this.period()}`;
      if (this.distributionsAutoLoadKey === autoLoadKey) return;
      this.distributionsAutoLoadKey = autoLoadKey;

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
    const investorKey = this.selectedInvestorKey();
    if (!investorKey) return;
    this.distributionsAutoLoadKey = null;
    this.periodsLoadKey = null;
    this.resetCollapsedGroups();
    this.store.dispatch(
      InvestorsApiActions.loadInvestorDistributionsPage({
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
    this.distributionsAutoLoadKey = null;
    this.resetCollapsedGroups();
    untracked(() => this.dispatchPage(1, true));
  }

  loadMore(): void {
    const detail = this.investorsDetail();
    if (
      detail.investorDistributionsLoading ||
      detail.investorDistributionsLoadingMore ||
      !detail.investorDistributionsHasNextPage
    ) {
      return;
    }
    const investorKey = detail.selectedKey;
    if (!investorKey) return;
    this.dispatchPage(detail.investorDistributionsPage + 1, false);
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
        { header: 'Fund Code', value: (r) => r.fundCode },
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
    const detail = this.investorsDetail();
    const investorKey = detail.selectedKey;
    if (!investorKey) return;

    if (replace) {
      this.resetCollapsedGroups();
    }

    this.store.dispatch(
      InvestorsApiActions.loadInvestorDistributionsPage({
        investorKey,
        timeframe: detail.investorDistributionsTimeframe,
        page,
        search: this.searchQuery(),
        replace,
        dateKey: dateKeyFromPeriodFilter(this.period()),
      }),
    );
  }
}
