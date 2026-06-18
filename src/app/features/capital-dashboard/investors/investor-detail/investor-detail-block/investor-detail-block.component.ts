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
  InvestorTransactionCategoryId,
} from '../models/investor-transaction-hub.models';
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
  readonly fundExposureRowClick = output<{ row: InvestorDetailTableRow; rowIndex: number }>();
  readonly overviewFundClick = output<{ fundKey: number }>();
  readonly transactionHubCategoryChange = output<InvestorTransactionCategoryId>();
  readonly transactionHubPageChange = output<number>();
  readonly hubFundFilterChange = output<string>();
  readonly hubTimeframe = input<'ltd' | 'quarterly' | 'daily'>('ltd');
  readonly hubTimeframeChange = output<'ltd' | 'quarterly' | 'daily'>();
  readonly hubQuarterChange = output<number>();
  readonly hubYearChange = output<number>();

  readonly hubFundFilter = input('all');
  readonly hubFundFilterApply = output<string>();
  readonly hubQuarterScope = input<number | 'all'>('all');
  readonly hubQuarterScopeChange = output<number | 'all'>();
  readonly hubQuarter = input<number | null>(null);
  readonly hubYear = input<number | null>(null);
  readonly hubAvailableQuarters = input<number[]>([]);
  readonly hubAvailableYears = input<number[]>([]);
  readonly underlyingInvestmentsPageChange = output<number>();

  readonly Math = Math;

  readonly hubFiltersPanelVisible = signal(false);
  readonly hubFundFilterDraft = signal('all');
  private readonly expandScopeKey = computed(
    () => `${this.tableContextKey()}\u0000${this.block().id}`,
  );
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

  readonly expanded = signal(true);

  constructor() {
    effect(() => {
      this.tableContextKey();
      this.searchQuery.set('');
      this.minCommitmentFilter.set('');
      this.hubFiltersPanelVisible.set(false);
      this.hubFundFilterDraft.set('all');
    });

    effect(() => {
      this.hubFundFilter();
      this.hubFundFilterDraft.set(this.hubFundFilter());
    });

    effect(() => {
      this.expandScopeKey();
      const block = this.block();
      this.expanded.set(block.defaultExpanded !== false);
    });
  }

  onTransactionSearchInput(value: string): void {
    this.searchQuery.set(value);
    const block = this.block();
    if (block.kind !== 'table' && block.kind !== 'transaction-hub') {
      return;
    }
    this.transactionSearchChange.emit({ blockId: block.id, search: value });
  }

  isTransactionHubBlock(): boolean {
    return this.block().kind === 'transaction-hub';
  }

  toggleHubFiltersPanel(): void {
    this.hubFiltersPanelVisible.update((visible) => !visible);
  }

  hubActiveFilterCount(): number {
    return this.hubFundFilter() !== 'all' ? 1 : 0;
  }

  hubDraftFilterCount(): number {
    return this.hubFundFilterDraft() !== 'all' ? 1 : 0;
  }

  hubFiltersActive(): boolean {
    return this.hubFiltersPanelVisible() || this.hubActiveFilterCount() > 0;
  }

  applyHubFilters(): void {
    this.hubFundFilterApply.emit(this.hubFundFilterDraft());
    this.hubFiltersPanelVisible.set(false);
  }

  clearHubFilters(): void {
    this.hubFundFilterDraft.set('all');
    this.hubFundFilterApply.emit('all');
    this.hubFiltersPanelVisible.set(false);
  }

  transactionHubPageNumbers(): number[] {
    const block = this.block();
    if (block.kind !== 'transaction-hub' || !block.pagination) {
      return [1];
    }
    return Array.from({ length: Math.max(block.pagination.totalPages, 1) }, (_, index) => index + 1);
  }

  transactionHubSummary(): string {
    const block = this.block();
    if (block.kind !== 'transaction-hub' || !block.pagination) {
      return '';
    }
    const { page, pageSize, totalCount } = block.pagination;
    if (totalCount === 0) {
      return 'Showing 0 of 0';
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    return `Showing ${start}–${end} of ${totalCount}`;
  }

  transactionHubLoadingMessage(): string {
    return 'Loading transactions…';
  }

  isHubTable(): boolean {
    return this.block().kind === 'transaction-hub';
  }

  hubShowAmount(value: InvestorDetailTableCellValue): boolean {
    return this.showAmount(value, this.isHubTable());
  }

  isFundExposureTable(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.id === 'fund-exposure';
  }

  isFundHoldingsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'fund-holdings';
  }

  isUnderlyingInvestmentsVariant(): boolean {
    const block = this.block();
    return block.kind === 'table' && block.variant === 'underlying-investments';
  }

  isPagedTableVariant(): boolean {
    return this.isUnderlyingInvestmentsVariant();
  }

  isFundHoldingsTableVariant(): boolean {
    return this.isFundHoldingsVariant() || this.isUnderlyingInvestmentsVariant();
  }

  pagedTablePageNumbers(): number[] {
    const block = this.block();
    if (block.kind !== 'table' || !block.pagination) {
      return [1];
    }
    return Array.from({ length: Math.max(block.pagination.totalPages, 1) }, (_, index) => index + 1);
  }

  pagedTableSummary(): string {
    const block = this.block();
    if (block.kind !== 'table' || !block.pagination) {
      return '';
    }
    const { page, pageSize, totalCount } = block.pagination;
    if (totalCount === 0) {
      return 'Showing 0 of 0';
    }
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalCount);
    return `Showing ${start}–${end} of ${totalCount}`;
  }

  pagedTableLoadingMessage(): string {
    if (this.isFundHoldingsVariant()) {
      return 'Loading fund holdings…';
    }
    if (this.isUnderlyingInvestmentsVariant()) {
      return 'Loading underlying investments…';
    }
    return 'Loading…';
  }

  onPagedTablePageChange(page: number): void {
    if (this.isUnderlyingInvestmentsVariant()) {
      this.underlyingInvestmentsPageChange.emit(page);
    }
  }

  onFundExposureRowClick(row: InvestorDetailTableRow, rowIndex: number): void {
    if (!this.isFundExposureTable()) {
      return;
    }
    const fundKey = row['fundKey'];
    if (typeof fundKey !== 'number' || !Number.isFinite(fundKey) || fundKey <= 0) {
      return;
    }
    this.fundExposureRowClick.emit({ row, rowIndex });
  }

  onFundHoldingsFundClick(row: InvestorDetailTableRow): void {
    const fundKey = row['fundKey'];
    if (typeof fundKey !== 'number' || !Number.isFinite(fundKey) || fundKey <= 0) {
      return;
    }
    this.overviewFundClick.emit({ fundKey });
  }

  isCapitalAccountBlock(): boolean {
    const block = this.block();
    return block.kind === 'field-grid' && block.id === 'capital-account';
  }

  isEntityOverviewBlock(): boolean {
    return this.block().kind === 'entity-overview';
  }

  readonly emptyStateMessage = computed(() => {
    if (this.isFundHoldingsVariant()) {
      if (this.tableSearchActive() || this.searchQuery().trim()) {
        return 'No fund holdings match your filters.';
      }
      return 'No fund holdings found for the selected date range.';
    }
    if (this.isUnderlyingInvestmentsVariant()) {
      return 'No underlying investments found.';
    }
    if (this.isTransactionHubBlock()) {
      if (this.tableSearchActive() || this.searchQuery().trim()) {
        return 'No transactions match your search.';
      }
      return 'No transactions found for the selected period.';
    }
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
    if (block.kind !== 'table' && block.kind !== 'transaction-hub') {
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

  sortIcon(column: InvestorDetailTableColumn): string | null {
    if (!this.isSortActive(column)) {
      return null;
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
    if (
      column.key === 'fundCode' ||
      column.key === 'fundName' ||
      column.key === 'fund' ||
      column.key === 'property' ||
      column.key === 'description' ||
      column.key === 'period' ||
      column.key === 'type' ||
      column.key === 'date' ||
      column.key === 'investorCode' ||
      column.key === 'investorName'
    ) {
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

  amountCellClass(column: InvestorDetailTableColumn): string {
    if (!this.isFundHoldingsVariant()) {
      return '';
    }
    if (column.key === 'unfunded' || column.tone === 'warning') {
      return 'inv-detail-table__amount-tone inv-detail-table__amount-tone--unfunded';
    }
    if (column.key === 'distributed' || column.tone === 'positive') {
      return 'inv-detail-table__amount-tone inv-detail-table__amount-tone--distributed';
    }
    return '';
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
    const type = String(value ?? '').trim();
    if (!type || type === '—') {
      return '';
    }
    return 'inv-detail-transactions__type-chip';
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

    if (query) {
      rows = rows.filter((row) =>
        Object.entries(row).some(([key, value]) => {
          if (key === INVESTOR_DETAIL_CELL_TONES_KEY || value == null || typeof value === 'object') {
            return false;
          }
          return String(value).toLowerCase().includes(query);
        }),
      );
    }

    if (Number.isFinite(minCommitment) && minCommitment > 0) {
      const minAmount = minCommitment * 1_000_000;
      rows = rows.filter((row) => {
        const committed = row['committed'];
        return typeof committed === 'number' && committed >= minAmount;
      });
    }

    const sortBy = this.sortColumn();
    if (sortBy && !this.isTransactionsVariant()) {
      const column = block.columns.find((item) => item.sortBy === sortBy);
      if (column) {
        const dir = this.sortDir() === 'asc' ? 1 : -1;
        rows = [...rows].sort((left, right) => compareTableRows(left, right, column.key, dir));
      }
    }

    return rows;
  }
}

function compareTableRows(
  left: InvestorDetailTableRow,
  right: InvestorDetailTableRow,
  key: string,
  dir: 1 | -1,
): number {
  const leftValue = left[key];
  const rightValue = right[key];

  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return (leftValue - rightValue) * dir;
  }

  const leftText = String(leftValue ?? '').trim().toLowerCase();
  const rightText = String(rightValue ?? '').trim().toLowerCase();
  return leftText.localeCompare(rightText) * dir;
}
