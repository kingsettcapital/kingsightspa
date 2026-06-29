import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import {
  InvestorAlias,
  InvestorApiService,
  InvestorBulkUpdateRequest,
  InvestorDto,
} from '../../core/services/investor-api.service';

type InvestorRow = {
  investorKey: number;
  investorCode: string;
  investorName: string;
  investorAliasKey: number | null;
  investorAliasName: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type InvestorAssignmentColumnKey =
  | 'investorCode'
  | 'investorName'
  | 'investorAliasName'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type InvestorAssignmentTableColumn = {
  key: InvestorAssignmentColumnKey;
  label: string;
};

const INVESTOR_ASSIGNMENT_TABLE_COLUMNS: InvestorAssignmentTableColumn[] = [
  { key: 'investorCode', label: 'Investor Code' },
  { key: 'investorName', label: 'Investor Name' },
  { key: 'investorAliasName', label: 'Investor Alias' },
  { key: 'userUpdatedBy', label: 'Modified By' },
  { key: 'userUpdatedDate', label: 'Modified Date' },
];

@Component({
  selector: 'app-investor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investor.component.html',
  styleUrl: './investor.component.css',
})
export class InvestorComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = INVESTOR_ASSIGNMENT_TABLE_COLUMNS;

  readonly searchText = signal('');
  readonly sortColumn = signal<InvestorAssignmentColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedInvestorCodes = signal<string[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<InvestorRow[]>([]);
  readonly aliasOptions = signal<InvestorAlias[]>([]);
  readonly originalRowState = signal<Record<string, number | null>>({});

  private readonly investorSearchInput = viewChild<ElementRef<HTMLInputElement>>('investorSearchInput');

  ngOnInit(): void {
    this.loadData();
  }

  readonly selectedInvestors = computed(() => {
    const selectedCodes = new Set(this.selectedInvestorCodes());
    return this.rows().filter((row) => selectedCodes.has(row.investorCode));
  });

  readonly searchedInvestorOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedCodes = new Set(this.selectedInvestorCodes());
    return this.rows().filter((row) => {
      if (selectedCodes.has(row.investorCode)) {
        return false;
      }
      return filterRowsByTableSearch(
        [row],
        keyword,
        this.tableColumns,
        (candidate, key) => this.getCellDisplayValue(candidate, key),
      ).length > 0;
    });
  });

  readonly filteredRows = computed(() => {
    const selectedCodes = this.selectedInvestorCodes();
    const keyword = this.searchText();

    let rows = this.rows();

    if (selectedCodes.length > 0) {
      const selectedCodeSet = new Set(selectedCodes);
      rows = rows.filter((row) => selectedCodeSet.has(row.investorCode));
    }

    rows = filterRowsByTableSearch(
      rows,
      keyword,
      this.tableColumns,
      (row, key) => this.getCellDisplayValue(row, key),
    );

    const activeSort = this.sortColumn();
    if (activeSort) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      rows = [...rows].sort(
        (left, right) => this.compareRows(left, right, activeSort) * direction,
      );
    }

    return rows;
  });

  readonly totalFilteredRows = computed(() => this.filteredRows().length);

  readonly totalPages = computed(() => {
    const totalRows = this.totalFilteredRows();
    if (totalRows === 0) {
      return 1;
    }
    return Math.ceil(totalRows / this.pageSize());
  });

  readonly paginatedRows = computed(() => {
    const rows = this.filteredRows();
    const pageSize = this.pageSize();
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    if (safeCurrentPage !== this.currentPage()) {
      queueMicrotask(() => this.currentPage.set(safeCurrentPage));
    }
    const start = (safeCurrentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  });

  readonly pageRangeLabel = computed(() => {
    const totalRows = this.totalFilteredRows();
    if (totalRows === 0) {
      return '0 - 0 of 0';
    }
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safeCurrentPage - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, totalRows);
    return `${start} - ${end} of ${totalRows}`;
  });

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  toggleSort(column: InvestorAssignmentColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: InvestorAssignmentColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim() || value === '-') {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  displayModifiedBy(value: string): string {
    const trimmed = value?.trim();
    return trimmed && trimmed !== '-' ? trimmed : '—';
  }

  getCellDisplayValue(row: InvestorRow, column: InvestorAssignmentColumnKey): string {
    switch (column) {
      case 'investorCode':
        return row.investorCode;
      case 'investorName':
        return row.investorName;
      case 'investorAliasName':
        return row.investorAliasName || '— Select alias —';
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  selectInvestor(row: InvestorRow): void {
    if (this.selectedInvestorCodes().includes(row.investorCode)) {
      return;
    }

    this.selectedInvestorCodes.set([...this.selectedInvestorCodes(), row.investorCode]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedInvestor(investorCode: string): void {
    this.selectedInvestorCodes.set(
      this.selectedInvestorCodes().filter((code) => code !== investorCode),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateAlias(investorCode: string, value: string): void {
    const investorAliasKey = value ? Number(value) : null;
    const alias = this.aliasOptions().find((a) => this.getAliasKey(a) === investorAliasKey);
    this.rows.set(
      this.rows().map((row) =>
        row.investorCode === investorCode
          ? {
              ...row,
              investorAliasKey,
              investorAliasName: alias?.investorAliasName ?? '',
            }
          : row,
      ),
    );
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedInvestorCodes.set([]);
    this.revertUnsavedAliasChanges();
    this.currentPage.set(1);
    this.clearMessages();

    const input = this.investorSearchInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
  }

  goToNextPage(): void {
    this.currentPage.set(Math.min(this.totalPages(), this.currentPage() + 1));
  }

  updatePageSize(value: string): void {
    const parsed = Number(value);
    const normalized =
      Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : this.defaultPageSize;
    this.pageSize.set(normalized);
    this.currentPage.set(1);
  }

  getAliasKey(alias: InvestorAlias): number {
    return alias.investorAliasId;
  }

  aliasSelectValue(row: InvestorRow): string {
    const key = this.resolveRowAliasKey(row);
    return key != null && key > 0 ? String(key) : '';
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.rows().length) {
      this.statusMessage.set('No investors loaded to save.');
      return;
    }

    const selectedCodes = this.selectedInvestorCodes();
    const keyword = this.searchText().trim();
    const targetRows = this.filteredRows();
    const changedRows = this.rows().filter((row) => this.hasAliasChanged(row));

    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const rowsToSave =
      selectedCodes.length > 0 || keyword
        ? changedRows.filter((row) => targetRows.some((t) => t.investorCode === row.investorCode))
        : changedRows;

    if (!rowsToSave.length) {
      this.statusMessage.set('No changes detected in the current selection.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const request: InvestorBulkUpdateRequest = {
      investors: rowsToSave.map((row) => ({
        investorKey: row.investorKey,
        investorCode: row.investorCode,
        investorAliasKey: row.investorAliasKey ?? 0,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.investorApi.updateInvestorAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const savedCodes = new Set(rowsToSave.map((row) => row.investorCode));

        this.rows.set(
          this.rows().map((row) =>
            savedCodes.has(row.investorCode)
              ? {
                  ...row,
                  userUpdatedBy,
                  userUpdatedDate: now,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.statusMessage.set(`${rowsToSave.length} investor(s) updated successfully.`);
        this.errorMessage.set('');
        this.isSaving.set(false);
      },
      error: (error) => {
        this.statusMessage.set('');
        this.errorMessage.set(this.extractBackendError(error));
        this.isSaving.set(false);
      },
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('Loading investors...');

    forkJoin({
      investors: this.investorApi.getInvestors(),
      aliases: this.investorApi.getAllAliases(),
    }).subscribe({
      next: ({ investors, aliases }) => {
        const normalizedAliases = this.normalizeAliases(aliases);
        const mappedRows = investors.map((record, index) =>
          this.mapApiInvestorToRow(record, index, normalizedAliases),
        );

        this.rows.set(mappedRows);
        this.aliasOptions.set(normalizedAliases);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mappedRows.length > 0
            ? `${mappedRows.length} investor(s) loaded.`
            : 'No investors returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.aliasOptions.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to load investors. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private mapApiInvestorToRow(
    record: InvestorDto,
    index: number,
    aliases: InvestorAlias[],
  ): InvestorRow {
    const investorAliasKey = this.resolveInvestorAliasKey(record, aliases);
    const alias =
      investorAliasKey != null
        ? aliases.find((a) => this.getAliasKey(a) === investorAliasKey)
        : undefined;

    return {
      investorKey: record.investorKey,
      investorCode: record.investorCode || `INV-${index + 1}`,
      investorName: record.investorName?.trim() || '—',
      investorAliasKey,
      investorAliasName: alias?.investorAliasName ?? record.investorAliasName?.trim() ?? '',
      userUpdatedBy: record.userUpdatedBy?.trim() ?? '',
      userUpdatedDate: record.userUpdatedDate ?? '',
    };
  }

  private resolveInvestorAliasKey(record: InvestorDto, aliases: InvestorAlias[]): number | null {
    const apiKey =
      record.investorAliasKey != null && Number(record.investorAliasKey) > 0
        ? Number(record.investorAliasKey)
        : null;

    if (apiKey != null) {
      return apiKey;
    }

    return this.resolveAliasKey(record.investorAliasName, aliases);
  }

  private resolveAliasKey(
    aliasName: string | null | undefined,
    aliases: InvestorAlias[],
  ): number | null {
    const normalized = aliasName?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = aliases.find((a) => a.investorAliasName.trim().toLowerCase() === normalized);
    return match ? this.getAliasKey(match) : null;
  }

  private resolveRowAliasKey(row: InvestorRow): number | null {
    if (row.investorAliasKey != null && row.investorAliasKey > 0) {
      return row.investorAliasKey;
    }

    return this.resolveAliasKey(row.investorAliasName, this.aliasOptions());
  }

  private normalizeAliases(aliases: InvestorAlias[]): InvestorAlias[] {
    return aliases.map((alias) => ({
      ...alias,
      investorAliasId: Number(alias.investorAliasId),
    }));
  }

  private revertUnsavedAliasChanges(): void {
    const original = this.originalRowState();
    const aliases = this.aliasOptions();

    this.rows.update((rows) =>
      rows.map((row) => {
        const originalKey = original[row.investorCode] ?? null;
        if (row.investorAliasKey === originalKey) {
          return row;
        }

        const alias =
          originalKey != null
            ? aliases.find((a) => this.getAliasKey(a) === originalKey)
            : undefined;

        return {
          ...row,
          investorAliasKey: originalKey,
          investorAliasName: alias?.investorAliasName ?? '',
        };
      }),
    );
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, number | null> = {};
    for (const row of this.rows()) {
      snapshot[row.investorCode] = row.investorAliasKey;
    }
    this.originalRowState.set(snapshot);
  }

  private hasAliasChanged(row: InvestorRow): boolean {
    const original = this.originalRowState()[row.investorCode];
    return row.investorAliasKey !== (original ?? null);
  }

  private compareRows(
    left: InvestorRow,
    right: InvestorRow,
    column: InvestorAssignmentColumnKey,
  ): number {
    switch (column) {
      case 'investorCode':
        return left.investorCode.localeCompare(right.investorCode, undefined, { sensitivity: 'base' });
      case 'investorName':
        return left.investorName.localeCompare(right.investorName, undefined, { sensitivity: 'base' });
      case 'investorAliasName':
        return left.investorAliasName.localeCompare(right.investorAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'userUpdatedBy':
        return left.userUpdatedBy.localeCompare(right.userUpdatedBy, undefined, { sensitivity: 'base' });
      case 'userUpdatedDate':
        return this.dateSortValue(left.userUpdatedDate) - this.dateSortValue(right.userUpdatedDate);
      default:
        return 0;
    }
  }

  private dateSortValue(value: string): number {
    if (!value?.trim()) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update investor alias changes.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as {
      error?: { message?: string; title?: string; detail?: string } | string;
      message?: string;
    };

    if (typeof maybeError.error === 'string' && maybeError.error.trim().length > 0) {
      return maybeError.error;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.message === 'string' &&
      maybeError.error.message.trim().length > 0
    ) {
      return maybeError.error.message;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.detail === 'string' &&
      maybeError.error.detail.trim().length > 0
    ) {
      return maybeError.error.detail;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.title === 'string' &&
      maybeError.error.title.trim().length > 0
    ) {
      return maybeError.error.title;
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }

    return fallback;
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
