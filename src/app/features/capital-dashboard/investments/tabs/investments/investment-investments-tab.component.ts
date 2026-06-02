import { Component, computed, inject, signal } from '@angular/core';
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

type InvestmentsRow = {
  period: string;
  amount: number;
  units: string;
  description: string;
};

@Component({
  selector: 'app-investment-investments-tab',
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
    KsCurrencyPipe,
  ],
  templateUrl: './investment-investments-tab.component.html',
  styleUrl: './investment-investments-tab.component.scss',
})
export class InvestmentInvestmentsTabComponent {
  private readonly excelService = inject(ExcelService);

  readonly timeframe = signal<'ltd' | 'quarterly' | 'daily'>('ltd');
  readonly period = signal<'all'>('all');
  readonly searchQuery = signal('');

  private readonly allRows = signal<InvestmentsRow[]>([
    {
      period: 'Life to Date',
      amount: 48000000,
      units: '480,000',
      description: 'Total Investment',
    },
  ]);

  readonly columns = ['period', 'amount', 'units', 'description'];

  readonly rows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const all = this.allRows();
    if (!q) return all;
    return all.filter((row) =>
      `${row.period} ${row.amount} ${row.units} ${row.description}`.toLowerCase().includes(q),
    );
  });

  downloadExcel(): void {
    const exportRows = this.rows();
    this.excelService.export<InvestmentsRow>({
      filename: 'investments.xlsx',
      sheetName: 'Investments',
      columns: [
        { header: 'Period', value: (r) => r.period },
        { header: 'Amount', value: (r) => r.amount },
        { header: 'Units', value: (r) => r.units },
        { header: 'Description', value: (r) => r.description },
      ],
      rows: exportRows,
    });
  }
}
