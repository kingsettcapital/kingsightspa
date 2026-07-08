import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  filterRowsByTableSearch,
} from '../../core/utils/mortgage-table-search';
import {
  normalizeStatusOptions,
  resolveDefaultStatusValues,
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';
import {
  LoanBulkUpdateRequest,
  LoanDto,
  LoansApiService,
} from '../../core/services/loans-api.service';

type LoanRow = {
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasKey: number | null;
  loanAliasName: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type LoanAssignmentColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type LoanAssignmentTableColumn = {
  key: LoanAssignmentColumnKey;
  label: string;
  audit?: boolean;
};

type LoanSelectOption = { value: string; label: string };

const LOAN_ASSIGNMENT_TABLE_COLUMNS: LoanAssignmentTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-loan-alias-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './loan-alias-assignment.component.html',
  styleUrl: './loan-alias-assignment.component.css',
})
export class LoanAliasAssignmentComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = LOAN_ASSIGNMENT_TABLE_COLUMNS;

  readonly searchText = signal('');
  readonly sortColumn = signal<LoanAssignmentColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanCodes = signal<string[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly selectedStatuses = signal<string[]>([]);
  /** Alias names that match the selected Status filter (from LoanSecurityValue). */
  readonly statusMatchingAliasNames = signal<Set<string> | null>(null);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<LoanRow[]>([]);
  readonly aliasOptions = signal<LoanAlias[]>([]);
  readonly originalRowState = signal<Record<string, number | null>>({});

  readonly loanSelectOptions = computed<LoanSelectOption[]>(() => {
    const seen = new Set<string>();
    const options: LoanSelectOption[] = [];
    for (const row of this.rows()) {
      if (!row.loanCode || seen.has(row.loanCode)) continue;
      seen.add(row.loanCode);
      options.push({
        value: row.loanCode,
        label: `${row.loanCode} ${row.loanName}`.trim(),
      });
    }

    return options.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
  });

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  ngOnInit(): void {
    this.loadData();
  }

  readonly selectedLoans = computed(() => {
    const selectedCodes = new Set(this.selectedLoanCodes());
    return this.rows().filter((row) => selectedCodes.has(row.loanCode));
  });

  readonly searchedLoanOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedCodes = new Set(this.selectedLoanCodes());
    return this.rows().filter((row) => {
      if (selectedCodes.has(row.loanCode)) {
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
    const statuses = this.selectedStatuses();
    if (!statuses.length) {
      return [];
    }

    const selectedCodes = this.selectedLoanCodes();
    const keyword = this.searchText();
    const statusAliases = this.statusMatchingAliasNames();

    let rows = this.rows();

    if (statusAliases) {
      rows = rows.filter((row) => {
        const alias = row.loanAliasName.trim().toLowerCase();
        // Keep unassigned / empty-alias rows so they remain assignable.
        if (!alias || alias === '—') {
          return true;
        }
        return statusAliases.has(alias);
      });
    }

    if (selectedCodes.length > 0) {
      const selectedCodeSet = new Set(selectedCodes);
      rows = rows.filter((row) => selectedCodeSet.has(row.loanCode));
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

  updateSelectedLoans(values: string[] | null): void {
    this.searchText.set('');
    this.selectedLoanCodes.set(values ?? []);
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.refreshStatusMatchingAliases();
  }

  toggleSort(column: LoanAssignmentColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: LoanAssignmentColumnKey): string {
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

  getCellDisplayValue(row: LoanRow, column: LoanAssignmentColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  selectLoan(row: LoanRow): void {
    if (this.selectedLoanCodes().includes(row.loanCode)) {
      return;
    }

    this.selectedLoanCodes.set([...this.selectedLoanCodes(), row.loanCode]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedLoan(loanCode: string): void {
    this.selectedLoanCodes.set(
      this.selectedLoanCodes().filter((code) => code !== loanCode),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateAlias(loanCode: string, value: string): void {
    const loanAliasKey = value ? Number(value) : null;
    const alias = this.aliasOptions().find((a) => this.getAliasKey(a) === loanAliasKey);
    this.rows.set(
      this.rows().map((row) =>
        row.loanCode === loanCode
          ? {
              ...row,
              loanAliasKey,
              loanAliasName: alias?.loanAliasName ?? '',
            }
          : row,
      ),
    );
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanCodes.set([]);
    this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
    this.revertUnsavedAliasChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.refreshStatusMatchingAliases();
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

  getAliasKey(alias: LoanAlias): number {
    const key = alias.loanAliasKey ?? alias.loanAliasId;
    return key != null ? Number(key) : 0;
  }

  aliasSelectValue(row: LoanRow): string {
    const key = this.resolveRowAliasKey(row);
    return key != null && key > 0 ? String(key) : '';
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    if (!this.rows().length) {
      this.statusMessage.set('No loans loaded to save.');
      return;
    }

    const selectedCodes = this.selectedLoanCodes();
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
        ? changedRows.filter((row) => targetRows.some((t) => t.loanCode === row.loanCode))
        : changedRows;

    if (!rowsToSave.length) {
      this.statusMessage.set('No changes detected in the current selection.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const request: LoanBulkUpdateRequest = {
      loans: rowsToSave.map((row) => ({
        loanKey: row.loanKey,
        loanCode: row.loanCode,
        loanAliasKey: row.loanAliasKey ?? 0,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.loansApi.updateLoanAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const savedCodes = new Set(rowsToSave.map((row) => row.loanCode));

        this.rows.set(
          this.rows().map((row) =>
            savedCodes.has(row.loanCode)
              ? {
                  ...row,
                  userUpdatedBy,
                  userUpdatedDate: now,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.statusMessage.set(`${rowsToSave.length} loan(s) updated successfully.`);
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
    this.statusMessage.set('Loading loans...');

    forkJoin({
      loans: this.loansApi.getLoans(),
      aliases: this.loanAliasApi.getAllAliases(),
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ loans, aliases, statuses }) => {
        const normalizedAliases = this.normalizeAliases(aliases);
        const mappedRows = loans.map((record, index) =>
          this.mapApiLoanToRow(record, index, normalizedAliases),
        );

        this.rows.set(mappedRows);
        this.aliasOptions.set(normalizedAliases);
        this.currentPage.set(1);
        this.snapshotOriginalState();

        const statusOptions = normalizeStatusOptions(statuses);
        this.statusOptions.set(statusOptions);
        if (!this.selectedStatuses().length) {
          this.selectedStatuses.set(resolveDefaultStatusValues(statusOptions));
        }
        this.refreshStatusMatchingAliases();

        this.statusMessage.set(
          mappedRows.length > 0
            ? `${mappedRows.length} loan(s) loaded.`
            : 'No loans returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.aliasOptions.set([]);
        this.statusMatchingAliasNames.set(null);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to load loans. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private refreshStatusMatchingAliases(): void {
    const statuses = this.selectedStatuses();
    if (!statuses.length) {
      this.statusMatchingAliasNames.set(new Set());
      return;
    }

    const aliasIds = this.aliasOptions()
      .map((alias) => this.getAliasKey(alias))
      .filter((id) => id > 0);

    if (!aliasIds.length) {
      this.statusMatchingAliasNames.set(null);
      return;
    }

    this.securityValueApi.getSecurityValues(aliasIds, statuses).subscribe({
      next: (rows) => {
        const names = new Set(
          rows
            .map((row) => String(row.loanAliasName ?? '').trim().toLowerCase())
            .filter((name) => name.length > 0),
        );
        this.statusMatchingAliasNames.set(names);
      },
      error: () => {
        this.statusMatchingAliasNames.set(null);
      },
    });
  }

  private mapApiLoanToRow(
    record: LoanDto,
    index: number,
    aliases: LoanAlias[],
  ): LoanRow {
    const loanAliasKey = this.resolveLoanAliasKey(record, aliases);
    const alias = loanAliasKey != null
      ? aliases.find((a) => this.getAliasKey(a) === loanAliasKey)
      : undefined;

    return {
      loanKey: record.loanKey,
      loanCode: record.loanCode || `LOAN-${index + 1}`,
      loanName: record.loanDesc?.trim() || '—',
      loanAliasKey,
      loanAliasName: alias?.loanAliasName ?? record.loanAliasName?.trim() ?? '',
      userUpdatedBy: record.userUpdatedBy?.trim() ?? '',
      userUpdatedDate: record.userUpdatedDate ?? '',
    };
  }

  private resolveLoanAliasKey(record: LoanDto, aliases: LoanAlias[]): number | null {
    const apiKey =
      record.loanAliasKey != null && Number(record.loanAliasKey) > 0
        ? Number(record.loanAliasKey)
        : null;

    if (apiKey != null) {
      return apiKey;
    }

    return this.resolveAliasKey(record.loanAliasName, aliases);
  }

  private resolveRowAliasKey(row: LoanRow): number | null {
    if (row.loanAliasKey != null && row.loanAliasKey > 0) {
      return row.loanAliasKey;
    }

    return this.resolveAliasKey(row.loanAliasName, this.aliasOptions());
  }

  private resolveAliasKey(
    aliasName: string | null | undefined,
    aliases: LoanAlias[],
  ): number | null {
    const normalized = aliasName?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = aliases.find((a) => a.loanAliasName.trim().toLowerCase() === normalized);
    return match ? this.getAliasKey(match) : null;
  }

  private normalizeAliases(aliases: LoanAlias[]): LoanAlias[] {
    return aliases.map((alias) => {
      const key = this.getAliasKey(alias);
      return {
        ...alias,
        loanAliasKey: key,
        loanAliasId: key,
      };
    });
  }

  private revertUnsavedAliasChanges(): void {
    const original = this.originalRowState();
    const aliases = this.aliasOptions();

    this.rows.update((rows) =>
      rows.map((row) => {
        const originalKey = original[row.loanCode] ?? null;
        if (row.loanAliasKey === originalKey) {
          return row;
        }

        const alias =
          originalKey != null
            ? aliases.find((a) => this.getAliasKey(a) === originalKey)
            : undefined;

        return {
          ...row,
          loanAliasKey: originalKey,
          loanAliasName: alias?.loanAliasName ?? '',
        };
      }),
    );
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, number | null> = {};
    for (const row of this.rows()) {
      snapshot[row.loanCode] = row.loanAliasKey;
    }
    this.originalRowState.set(snapshot);
  }

  private hasAliasChanged(row: LoanRow): boolean {
    const original = this.originalRowState()[row.loanCode];
    return row.loanAliasKey !== (original ?? null);
  }

  private compareRows(left: LoanRow, right: LoanRow, column: LoanAssignmentColumnKey): number {
    switch (column) {
      case 'loanCode':
        return left.loanCode.localeCompare(right.loanCode, undefined, { sensitivity: 'base' });
      case 'loanName':
        return left.loanName.localeCompare(right.loanName, undefined, { sensitivity: 'base' });
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
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

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update loan alias changes.';
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
