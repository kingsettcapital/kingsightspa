import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { KsCurrencyPipe } from '../../../../../shared/pipes/ks-currency.pipe';
import { ExcelService } from '../../../../../core/services/excel.service';
import {
  filterInvestmentDetailTabRows,
  InvestmentDetailTabRow,
  rowsForInvestmentDetailTimeframe,
  sumInvestmentDetailTabRows,
} from '../investment-detail-tab.util';

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
    MatSelectModule,
    MatTableModule,
    DecimalPipe,
    KsCurrencyPipe,
  ],
  templateUrl: './investment-unfunded-commitment-tab.component.html',
  styleUrl: './investment-unfunded-commitment-tab.component.scss',
})
export class InvestmentUnfundedCommitmentTabComponent {
  private readonly excelService = inject(ExcelService);
  readonly fundType = input('');

  readonly timeframe = signal<'ltd' | 'quarterly' | 'daily'>('ltd');
  readonly period = signal<'all'>('all');
  readonly searchQuery = signal('');

  private readonly ltdRows = signal<InvestmentDetailTabRow[]>([
    {
      period: 'Life to Date',
      amount: 4000000,
      units: '0',
      description: 'Total Unfunded Commitment',
    },
  ]);

  private readonly quarterlyRows = signal<InvestmentDetailTabRow[]>([
    {
      period: 'Q4 2025',
      amount: 2200000,
      units: '0',
      description: 'Quarterly unfunded commitment',
    },
    {
      period: 'Q1 2026',
      amount: 1800000,
      units: '0',
      description: 'Quarterly unfunded commitment',
    },
  ]);

  private readonly dailyRows = signal<InvestmentDetailTabRow[]>([
    {
      date: '2026-01-15',
      amount: 125000,
      units: '0',
      description: 'Daily unfunded commitment',
    },
    {
      date: '2026-01-22',
      amount: 87500,
      units: '0',
      description: 'Daily unfunded commitment',
    },
  ]);

  readonly isDaily = computed(() => this.timeframe() === 'daily');
  readonly showSummaryFooter = computed(() => this.timeframe() !== 'ltd');

  readonly columns = computed(() =>
    this.isDaily() ? ['date', 'amount', 'units', 'description'] : ['period', 'amount', 'units', 'description'],
  );

  readonly rows = computed(() =>
    filterInvestmentDetailTabRows(
      rowsForInvestmentDetailTimeframe(this.timeframe(), {
        ltd: this.ltdRows(),
        quarterly: this.quarterlyRows(),
        daily: this.dailyRows(),
      }),
      this.searchQuery(),
    ),
  );

  readonly totalAmount = computed(() => sumInvestmentDetailTabRows(this.rows()).totalAmount);
  readonly totalUnits = computed(() => sumInvestmentDetailTabRows(this.rows()).totalUnits);

  downloadExcel(): void {
    const exportRows = this.rows();
    const periodColumn = this.isDaily()
      ? { header: 'Date', value: (r: InvestmentDetailTabRow) => r.date ?? '' }
      : { header: 'Period', value: (r: InvestmentDetailTabRow) => r.period ?? '' };

    this.excelService.export<InvestmentDetailTabRow>({
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
}
