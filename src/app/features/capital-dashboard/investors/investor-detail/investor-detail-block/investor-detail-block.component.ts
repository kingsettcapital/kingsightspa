import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

import { KsCurrencyPipe } from '../../../../../shared/pipes/ks-currency.pipe';
import {
  InvestorDetailBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailFieldItem,
} from '../models/investor-detail-block.models';
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
  /** Changes when investor/timeframe/period changes — resets transaction search UI. */
  readonly tableContextKey = input('');
  readonly tableLoading = input(false);
  readonly tableSearchActive = input(false);
  readonly sortColumn = input<string | null>(null);
  readonly sortDir = input<'asc' | 'desc'>('desc');
  readonly transactionSearchChange = output<{ blockId: string; search: string }>();
  readonly transactionSortChange = output<{
    blockId: string;
    sortBy: string;
    defaultDir: 'asc' | 'desc';
  }>();

  readonly expanded = signal(true);
  readonly searchQuery = signal('');
  readonly filtersPanelVisible = signal(false);
  readonly minCommitmentFilter = signal('');
  readonly documentTypeFilter = signal('all');

  readonly documentTypeOptions = [
    'All Types',
    'Quarterly Report',
    'Annual Report',
    'Appraisal',
    'Project Update',
    'Lease',
    'Permit',
    'Environmental',
    'Insurance',
  ];

  constructor() {
    effect(() => {
      this.tableContextKey();
      this.searchQuery.set('');
      this.minCommitmentFilter.set('');
    });
  }

  onTransactionSearchInput(value: string): void {
    this.searchQuery.set(value);
    const block = this.block();
    if (block.kind !== 'table') {
      return;
    }
    this.transactionSearchChange.emit({ blockId: block.id, search: value });
  }

  readonly emptyStateMessage = computed(() => {
    if (this.tableSearchActive() || this.searchQuery().trim()) {
      return 'No results found for your search.';
    }
    return 'No data available.';
  });

  toggleSort(column: InvestorDetailTableColumn): void {
    if (!column.sortBy) {
      return;
    }

    const block = this.block();
    if (block.kind !== 'table') {
      return;
    }

    this.transactionSortChange.emit({
      blockId: block.id,
      sortBy: column.sortBy,
      defaultDir: this.defaultSortDir(column),
    });
  }

  isSortActive(column: InvestorDetailTableColumn): boolean {
    return !!column.sortBy && this.sortColumn() === column.sortBy;
  }

  sortIcon(column: InvestorDetailTableColumn): string {
    if (!this.isSortActive(column)) {
      return 'unfold_more';
    }
    return this.sortDir() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  private defaultSortDir(column: InvestorDetailTableColumn): 'asc' | 'desc' {
    if (column.type === 'amount' || column.type === 'number' || column.type === 'percent') {
      return 'desc';
    }
    return 'asc';
  }

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

  transactionHeadCellClass(column: InvestorDetailTableColumn): string {
    const classes = [`inv-detail-table__head--${column.key}`];
    if (column.align === 'right') {
      classes.push('inv-detail-table__head--right');
    }
    if (column.key === 'fundCode' || column.key === 'fundName' || column.key === 'investorCode' || column.key === 'investorName') {
      classes.push('inv-detail-table__head--label');
    } else {
      classes.push('inv-detail-table__head--metric');
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

  displayAmountValue(value: InvestorDetailTableCellValue): number | null {
    const amount = this.amountValue(value);
    if (amount == null) {
      return null;
    }
    return this.isAssetTransactionsVariant() ? Math.abs(amount) : amount;
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
    return block.kind === 'table' && block.showToolbar === true;
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

  transactionActiveFilterCount(): number {
    const minCommitment = Number(this.minCommitmentFilter());
    return Number.isFinite(minCommitment) && minCommitment > 0 ? 1 : 0;
  }

  transactionsFiltersActive(): boolean {
    return this.filtersPanelVisible() || this.transactionActiveFilterCount() > 0;
  }

  clearTransactionFilters(): void {
    this.minCommitmentFilter.set('');
  }

  documentActiveFilterCount(): number {
    return this.documentTypeFilter() !== 'all' ? 1 : 0;
  }

  documentsFiltersActive(): boolean {
    return this.documentActiveFilterCount() > 0;
  }

  clearDocumentFilters(): void {
    this.documentTypeFilter.set('all');
  }

  isPerformanceKpiRow(): boolean {
    const block = this.block();
    return block.kind === 'kpi-row' && block.display === 'performance';
  }

  isEsgBlock(): boolean {
    return this.block().kind === 'esg-metrics';
  }

  isDebtBlock(): boolean {
    return this.block().kind === 'debt-financing';
  }

  isLeasingBlock(): boolean {
    return this.block().kind === 'leasing-summary';
  }

  isRiskBlock(): boolean {
    return this.block().kind === 'risk-insurance';
  }

  isAssetTransactionsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'asset-transactions';
  }

  isPairedFieldGrid(): boolean {
    const block = this.block();
    return block.kind === 'field-grid' && block.layout === 'paired-rows';
  }

  pairedFieldRows(block: InvestorDetailFieldGridBlock): InvestorDetailFieldItem[][] {
    const left = block.columns[0]?.fields ?? [];
    const right = block.columns[1]?.fields ?? [];
    const rowCount = Math.max(left.length, right.length);
    const rows: InvestorDetailFieldItem[][] = [];

    for (let index = 0; index < rowCount; index += 1) {
      const row: InvestorDetailFieldItem[] = [];
      if (left[index]) {
        row.push(left[index]);
      }
      if (right[index]) {
        row.push(right[index]);
      }
      if (row.length) {
        rows.push(row);
      }
    }

    return rows;
  }

  formatAssetSignedAmount(value: InvestorDetailTableCellValue): string {
    const amount = this.amountValue(value);
    if (amount == null) {
      return '—';
    }
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Math.abs(amount));
    return amount < 0 ? `(${formatted})` : formatted;
  }

  assetAmountClass(row: InvestorDetailTableRow, key: string): string {
    const amount = this.amountValue(this.cellValue(row, key));
    const classes = ['inv-detail-table__amount'];
    if (amount == null) {
      return classes.join(' ');
    }
    classes.push(amount < 0 ? 'inv-detail-table__amount--negative' : 'inv-detail-table__amount--positive');
    return classes.join(' ');
  }

  transactionTypeClass(value: InvestorDetailTableCellValue): string {
    const type = String(value ?? '').toLowerCase();
    const base = 'inv-detail-block__tx-type';
    if (type.includes('acquisition')) {
      return `${base} ${base}--acquisition`;
    }
    if (type.includes('distribution')) {
      return `${base} ${base}--distribution`;
    }
    if (type.includes('capital call')) {
      return `${base} ${base}--capital-call`;
    }
    if (type.includes('refinancing') || type.includes('financing')) {
      return `${base} ${base}--refinancing`;
    }
    if (type.includes('sale') || type.includes('disposition')) {
      return `${base} ${base}--sale`;
    }
    return base;
  }

  riskFlagClass(tone?: string): string {
    if (tone === 'positive') {
      return 'inv-detail-block__risk-flag inv-detail-block__risk-flag--positive';
    }
    if (tone === 'warning') {
      return 'inv-detail-block__risk-flag inv-detail-block__risk-flag--warning';
    }
    return 'inv-detail-block__risk-flag';
  }

  bannerClass(tone: 'positive' | 'warning'): string {
    return `inv-detail-block__risk-banner inv-detail-block__risk-banner--${tone}`;
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

  kpiVariantClass(variant?: string): string {
    return `inv-detail-block__kpi inv-detail-block__kpi--${variant ?? 'navy'}`;
  }

  filteredDocuments() {
    const query = this.searchQuery().trim().toLowerCase();
    const typeFilter = this.documentTypeFilter();
    const block = this.block();
    if (block.kind !== 'document-list') {
      return [];
    }

    return block.documents.filter((doc) => {
      const matchesQuery =
        !query ||
        doc.name.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query);
      const matchesType =
        typeFilter === 'all' || doc.category.toLowerCase() === typeFilter.toLowerCase();
      return matchesQuery && matchesType;
    });
  }

  filteredTableRows() {
    const block = this.block();
    if (block.kind !== 'table') {
      return [];
    }
    const query = this.searchQuery().trim().toLowerCase();
    const minCommitment = Number(this.minCommitmentFilter());
    let rows = block.rows;

    if (query && !this.isTransactionsVariant()) {
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
