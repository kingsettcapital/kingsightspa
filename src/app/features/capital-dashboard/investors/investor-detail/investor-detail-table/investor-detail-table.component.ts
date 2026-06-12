import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { KsCurrencyPipe } from '../../../../../shared/pipes/ks-currency.pipe';
import {
  InvestorDetailTableColumn,
  InvestorDetailTableConfig,
  InvestorDetailTableCellValue,
  InvestorDetailTableRow,
} from '../models/investor-detail-table.models';

@Component({
  selector: 'app-investor-detail-table',
  standalone: true,
  imports: [MatIconModule, KsCurrencyPipe],
  templateUrl: './investor-detail-table.component.html',
  styleUrl: './investor-detail-table.component.scss',
})
export class InvestorDetailTableComponent {
  readonly config = input.required<InvestorDetailTableConfig>();

  readonly expanded = signal(true);

  toggleExpanded(): void {
    if (!this.config().collapsible) {
      return;
    }
    this.expanded.update((value) => !value);
  }

  isExpanded(): boolean {
    const table = this.config();
    if (!table.collapsible) {
      return true;
    }
    return this.expanded();
  }

  cellValue(row: InvestorDetailTableRow, key: string): InvestorDetailTableCellValue {
    const value = row[key];
    if (value != null && typeof value === 'object') {
      return null;
    }
    return value as InvestorDetailTableCellValue;
  }

  cellClass(column: InvestorDetailTableColumn): string {
    const classes = ['inv-detail-table__cell'];
    if (column.align === 'right') {
      classes.push('inv-detail-table__cell--right');
    }
    if (column.tone && column.tone !== 'default') {
      classes.push(`inv-detail-table__cell--${column.tone}`);
    }
    if (column.type === 'link') {
      classes.push('inv-detail-table__cell--link');
    }
    return classes.join(' ');
  }

  formatNumber(value: InvestorDetailTableCellValue): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }

  amountValue(value: InvestorDetailTableCellValue): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }
}
