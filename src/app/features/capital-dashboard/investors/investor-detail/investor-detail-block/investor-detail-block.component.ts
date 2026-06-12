import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { KsCurrencyPipe } from '../../../../../shared/pipes/ks-currency.pipe';
import { InvestorDetailBlock } from '../models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailColumnTone,
  InvestorDetailTableColumn,
  InvestorDetailTableCellValue,
  InvestorDetailTableRow,
} from '../models/investor-detail-table.models';

@Component({
  selector: 'app-investor-detail-block',
  standalone: true,
  imports: [FormsModule, MatIconModule, KsCurrencyPipe],
  templateUrl: './investor-detail-block.component.html',
  styleUrl: './investor-detail-block.component.scss',
})
export class InvestorDetailBlockComponent {
  readonly block = input.required<InvestorDetailBlock>();

  readonly expanded = signal(true);
  readonly searchQuery = signal('');
  readonly filtersPanelVisible = signal(false);
  readonly minCommitmentFilter = signal('');

  toggleExpanded(): void {
    const current = this.block();
    if (!current.collapsible) {
      return;
    }
    this.expanded.update((value) => !value);
  }

  isExpanded(): boolean {
    const current = this.block();
    if (!current.collapsible) {
      return true;
    }
    return this.expanded();
  }

  cellValue(row: InvestorDetailTableRow | null | undefined, key: string): InvestorDetailTableCellValue {
    if (!row) {
      return null;
    }
    const value = row[key];
    if (value != null && typeof value === 'object') {
      return null;
    }
    return value as InvestorDetailTableCellValue;
  }

  cellClass(column: InvestorDetailTableColumn, row?: InvestorDetailTableRow): string {
    const classes = ['inv-detail-table__cell', `inv-detail-table__cell--${column.key}`];
    if (column.align === 'right') {
      classes.push('inv-detail-table__cell--right');
    }

    const rowTones = row?.[INVESTOR_DETAIL_CELL_TONES_KEY] as
      | Record<string, InvestorDetailColumnTone>
      | undefined;
    const tone = rowTones?.[column.key] ?? column.tone;
    if (tone && tone !== 'default') {
      classes.push(`inv-detail-table__cell--${tone}`);
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

  formatPercent(value: InvestorDetailTableCellValue): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '—';
    }
    return `${value.toFixed(1)}%`;
  }

  amountValue(value: InvestorDetailTableCellValue): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    return null;
  }

  showAmount(value: InvestorDetailTableCellValue, dashZero = false): boolean {
    if (!dashZero) {
      return this.amountValue(value) != null;
    }
    const amount = this.amountValue(value);
    return amount != null && amount !== 0;
  }

  isTransactionsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'transactions';
  }

  isInvestmentsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'investments';
  }

  isCommunicationsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'communications';
  }

  isDocumentsVariant(): boolean {
    return this.block().kind === 'document-list';
  }

  toggleFiltersPanel(): void {
    this.filtersPanelVisible.update((value) => !value);
  }

  statusClass(value: InvestorDetailTableCellValue): string {
    const status = String(value ?? '').toLowerCase();
    const usePill = !this.isCommunicationsVariant();

    if (status.includes('stabilized') || status.includes('completed') || status.includes('sent') || status.includes('low') || status.includes('executed')) {
      return usePill
        ? 'inv-detail-block__status inv-detail-block__status--positive'
        : 'inv-detail-block__status-text inv-detail-block__status-text--positive';
    }
    if (status.includes('value-add') || status.includes('value add')) {
      return usePill
        ? 'inv-detail-block__status inv-detail-block__status--warning'
        : 'inv-detail-block__status-text inv-detail-block__status-text--warning';
    }
    if (status.includes('scheduled')) {
      return usePill
        ? 'inv-detail-block__status inv-detail-block__status--scheduled'
        : 'inv-detail-block__status-text inv-detail-block__status-text--scheduled';
    }
    return usePill ? 'inv-detail-block__status' : 'inv-detail-block__status-text';
  }

  fieldToneClass(tone?: string): string {
    if (!tone || tone === 'default') {
      return 'inv-detail-block__field-value';
    }
    return `inv-detail-block__field-value inv-detail-block__field-value--${tone}`;
  }

  kpiVariantClass(variant: string): string {
    return `inv-detail-block__kpi inv-detail-block__kpi--${variant}`;
  }

  filteredDocuments() {
    const query = this.searchQuery().trim().toLowerCase();
    const block = this.block();
    if (block.kind !== 'document-list') {
      return [];
    }
    if (!query) {
      return block.documents;
    }
    return block.documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query),
    );
  }

  filteredTableRows() {
    const block = this.block();
    if (block.kind !== 'table') {
      return [];
    }
    const query = this.searchQuery().trim().toLowerCase();
    const minCommitment = Number(this.minCommitmentFilter());
    let rows = block.rows;

    if (query) {
      rows = rows.filter((row) =>
        Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query)),
      );
    }

    if (Number.isFinite(minCommitment) && minCommitment > 0) {
      const minAmount = minCommitment * 1_000_000;
      rows = rows.filter((row) => {
        const committed = row['committed'];
        return typeof committed === 'number' && committed >= minAmount;
      });
    }

    return rows;
  }
}
