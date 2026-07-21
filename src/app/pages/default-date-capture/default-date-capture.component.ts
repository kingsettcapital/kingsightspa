import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { buildMortgageGridLoadMessage } from '../../core/utils/mortgage-grid-load-message.util';
import {
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import {
  DefaultDateCaptureApiService,
  DefaultDateCaptureBulkUpdateRequest,
  DefaultDateCaptureRowDto,
} from '../../core/services/default-date-capture-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type DefaultDateRow = {
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasName: string;
  loanTermDefaultDate: string;
  defaultDate: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type DefaultDateColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'loanTermDefaultDate'
  | 'defaultDate'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type DefaultDateTableColumn = {
  key: DefaultDateColumnKey;
  label: string;
  editable?: boolean;
  audit?: boolean;
};

const DEFAULT_DATE_TABLE_COLUMNS: DefaultDateTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'loanTermDefaultDate', label: 'Loan Term Default Date' },
  { key: 'defaultDate', label: 'Default Date', editable: true },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-default-date-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './default-date-capture.component.html',
  styleUrl: './default-date-capture.component.css',
})
export class DefaultDateCaptureComponent implements OnInit {
  private readonly defaultDateApi = inject(DefaultDateCaptureApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = DEFAULT_DATE_TABLE_COLUMNS;

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly searchText = signal('');
  readonly sortColumn = signal<DefaultDateColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedAliasNames = signal<string[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<DefaultDateRow[]>([]);
  readonly originalRowState = signal<Record<string, string>>({});
  /** Ignores the empty search emit ng-select fires right after selecting a chip. */
  private suppressEmptySearchClear = false;

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  ngOnInit(): void {
    this.loadFilters();
  }

  readonly selectedAliases = computed(() => {
    const names = new Set(this.selectedAliasNames().map((n) => n.toLowerCase()));
    return this.aliasOptions().filter((a) => names.has(a.loanAliasName.toLowerCase()));
  });

  readonly aliasSelectOptions = computed(() =>
    this.aliasOptions().map((alias) => ({
      label: alias.loanAliasName,
      value: alias.loanAliasName,
    })),
  );

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  readonly searchedAliasOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedNames = new Set(this.selectedAliasNames().map((n) => n.toLowerCase()));
    return this.aliasOptions().filter(
      (a) =>
        !selectedNames.has(a.loanAliasName.toLowerCase()) &&
        a.loanAliasName.toLowerCase().includes(keyword),
    );
  });

  readonly filteredRows = computed(() => {
    const selectedNames = this.selectedAliasNames();
    const keyword = this.searchText();

    let rows = this.rows();

    if (selectedNames.length > 0) {
      const nameSet = new Set(selectedNames.map((n) => n.toLowerCase()));
      rows = rows.filter((row) => nameSet.has(row.loanAliasName.trim().toLowerCase()));
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

  readonly gridLoadMessage = computed(() =>
    buildMortgageGridLoadMessage({
      isLoading: this.isLoadingGrid() || this.isLoadingFilters(),
      totalRows: this.rows().length,
      visibleRows: this.filteredRows().length,
      hasClientFilter:
        this.selectedAliasNames().length > 0 || this.searchText().trim().length > 0,
      emptyMessage: 'No loans returned for the selected filters.',
    }),
  );

  readonly totalPages = computed(() => {
    const total = this.filteredRows().length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize());
  });

  readonly paginatedRows = computed(() => {
    const rows = this.filteredRows();
    const pageSize = this.pageSize();
    const maxPage = this.totalPages();
    const safePage = Math.max(1, Math.min(this.currentPage(), maxPage));
    if (safePage !== this.currentPage()) {
      queueMicrotask(() => this.currentPage.set(safePage));
    }
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  });

  readonly pageRangeLabel = computed(() => {
    const total = this.filteredRows().length;
    if (total === 0) {
      return '0 - 0 of 0';
    }
    const maxPage = this.totalPages();
    const safePage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safePage - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start} - ${end} of ${total}`;
  });

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  /** Live typeahead → grid filter (keeps last term when ng-select clears search after a chip select). */
  onLoanSearch(event: { term: string } | string | null): void {
    const term = typeof event === 'string' ? event : (event?.term ?? '');
    if (!term.trim() && this.suppressEmptySearchClear) {
      return;
    }
    this.updateSearch(term);
  }

  updateSelectedAliases(names: string[] | null): void {
    this.suppressEmptySearchClear = true;
    this.selectedAliasNames.set(names ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
    queueMicrotask(() => {
      this.suppressEmptySearchClear = false;
    });
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  selectAlias(alias: AliasOption): void {
    const name = alias.loanAliasName.trim();
    if (!name || this.selectedAliasNames().includes(name)) {
      return;
    }
    this.selectedAliasNames.set([...this.selectedAliasNames(), name]);
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedAlias(loanAliasName: string): void {
    this.selectedAliasNames.set(
      this.selectedAliasNames().filter((name) => name !== loanAliasName),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedAliasNames.set([]);
    this.selectedStatuses.set([]);
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  toggleSort(column: DefaultDateColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: DefaultDateColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  toggleStatus(statusValue: string): void {
    const current = this.selectedStatuses();
    const next = current.includes(statusValue)
      ? current.filter((s) => s !== statusValue)
      : [...current, statusValue];
    this.selectedStatuses.set(next);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  isStatusSelected(statusValue: string): boolean {
    return this.selectedStatuses().includes(statusValue);
  }

  updateDefaultDate(loanCode: string, value: string): void {
    const normalized = value.trim();
    this.rows.set(
      this.rows().map((row) =>
        row.loanCode === loanCode ? { ...row, defaultDate: normalized } : row,
      ),
    );
    this.clearMessages();
  }

  formatDisplayDate(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const iso = this.toDateInputValue(value);
    if (!iso) {
      return value;
    }
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.formatDisplayDate(value);
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

  getCellDisplayValue(row: DefaultDateRow, column: DefaultDateColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'loanTermDefaultDate':
        return this.formatDisplayDate(row.loanTermDefaultDate);
      case 'defaultDate':
        return this.formatDisplayDate(row.defaultDate);
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const changedRows = this.rows().filter((row) => this.hasRowChanged(row));
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const request: DefaultDateCaptureBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        loanCode: row.loanCode,
        defaultDate: row.defaultDate || null,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.defaultDateApi.saveDefaultDates(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const savedCodes = new Set(changedRows.map((row) => row.loanCode));
        this.rows.set(
          this.rows().map((row) =>
            savedCodes.has(row.loanCode)
              ? { ...row, userUpdatedBy, userUpdatedDate: now }
              : row,
          ),
        );
        this.snapshotOriginalState();
        this.statusMessage.set(`${changedRows.length} loan(s) updated successfully.`);
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

  private loadFilters(): void {
    this.isLoadingFilters.set(true);
    this.errorMessage.set('');

    forkJoin({
      aliases: this.loanAliasApi.getAll().pipe(catchError(() => of([]))),
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ aliases, statuses }) => {
        this.aliasOptions.set(this.normalizeAliases(aliases));
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set([]);
        this.isLoadingFilters.set(false);
        this.loadGrid();
      },
      error: () => {
        this.isLoadingFilters.set(false);
        this.errorMessage.set('Unable to load filters.');
      },
    });
  }

  private loadGrid(): void {
    const statuses = this.selectedStatuses();

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.defaultDateApi.getLoans(statuses).subscribe({
      next: (records) => {
        const mapped = records.map((r) => this.mapRow(r));
        this.rows.set(mapped);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoadingGrid.set(false);
      },
      error: (error) => {
        this.rows.set([]);
        this.originalRowState.set({});
        this.errorMessage.set(this.extractBackendError(error));
        this.isLoadingGrid.set(false);
      },
    });
  }

  private mapRow(record: DefaultDateCaptureRowDto): DefaultDateRow {
    const loanTerm = this.toDateInputValue(record.loanTermDefaultDate);
    const stored = this.toDateInputValue(record.defaultDate);
    const loanCode = record.loanId?.trim() || '';
    return {
      loanKey: Number(record.loanKey) > 0 ? Number(record.loanKey) : 0,
      loanCode: loanCode || '-',
      loanName: record.description?.trim() || '—',
      loanAliasName: record.loanAliasName?.trim() || '—',
      loanTermDefaultDate: loanTerm,
      defaultDate: stored || loanTerm,
      userUpdatedBy: record.userUpdatedBy?.trim() ?? '',
      userUpdatedDate: record.userUpdatedDate ?? '',
    };
  }

  private normalizeAliases(aliases: LoanAlias[]): AliasOption[] {
    return aliases
      .map((a) => ({
        loanAliasId: Number(a.loanAliasId ?? a.loanAliasKey ?? 0),
        loanAliasName: a.loanAliasName?.trim() || '',
      }))
      .filter((a) => a.loanAliasId > 0 && a.loanAliasName.length > 0)
      .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName));
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, string> = {};
    for (const row of this.rows()) {
      snapshot[row.loanCode] = row.defaultDate;
    }
    this.originalRowState.set(snapshot);
  }

  private revertUnsavedChanges(): void {
    const original = this.originalRowState();
    this.rows.update((rows) =>
      rows.map((row) => {
        const stored = original[row.loanCode];
        return stored !== undefined ? { ...row, defaultDate: stored } : row;
      }),
    );
  }

  private hasRowChanged(row: DefaultDateRow): boolean {
    return row.defaultDate !== (this.originalRowState()[row.loanCode] ?? '');
  }

  private compareRows(
    left: DefaultDateRow,
    right: DefaultDateRow,
    column: DefaultDateColumnKey,
  ): number {
    switch (column) {
      case 'loanCode':
        return left.loanCode.localeCompare(right.loanCode, undefined, { sensitivity: 'base' });
      case 'loanName':
        return left.loanName.localeCompare(right.loanName, undefined, { sensitivity: 'base' });
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'loanTermDefaultDate':
        return this.dateSortValue(left.loanTermDefaultDate) - this.dateSortValue(right.loanTermDefaultDate);
      case 'defaultDate':
        return this.dateSortValue(left.defaultDate) - this.dateSortValue(right.defaultDate);
      case 'userUpdatedBy':
        return left.userUpdatedBy.localeCompare(right.userUpdatedBy, undefined, {
          sensitivity: 'base',
        });
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

  private toDateInputValue(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '';
    }
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeStatusOptions(statuses: unknown): LoanStatusFilterOption[] {
    if (!Array.isArray(statuses) || !statuses.length) {
      return [];
    }
    if (typeof statuses[0] === 'string') {
      return (statuses as string[]).map((s) => ({ value: s, displayLabel: s }));
    }
    return (statuses as Record<string, unknown>[]).map((row) => ({
      value: String(row['value'] ?? '').trim(),
      displayLabel: String(row['displayLabel'] ?? row['value'] ?? '').trim(),
    }));
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to load or save default date capture data.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }
    const maybeError = error as {
      error?: { message?: string; detail?: string } | string;
      message?: string;
    };
    if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
      return maybeError.error;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.detail === 'string' &&
      maybeError.error.detail.trim()
    ) {
      return maybeError.error.detail;
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }
    return fallback;
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
