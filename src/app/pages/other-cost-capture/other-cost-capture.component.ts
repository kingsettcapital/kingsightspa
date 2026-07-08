import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import {
  resolveDefaultStatusValues,
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  OtherCostCaptureApiService,
  OtherCostCaptureBulkUpdateRequest,
  OtherCostCaptureRowDto,
} from '../../core/services/other-cost-capture-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type EditableCosts = {
  outstandingInvoices: number | null;
  estRealizationCosts: number | null;
  costToComplete: number | null;
};

type OtherCostRow = {
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasName: string;
} & EditableCosts & {
    userUpdatedBy: string;
    userUpdatedDate: string;
  };

type OtherCostColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'outstandingInvoices'
  | 'estRealizationCosts'
  | 'costToComplete'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type OtherCostTableColumn = {
  key: OtherCostColumnKey;
  label: string;
  numeric?: boolean;
  audit?: boolean;
};

const OTHER_COST_TABLE_COLUMNS: OtherCostTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'outstandingInvoices', label: 'Outstanding Invoice', numeric: true },
  { key: 'estRealizationCosts', label: 'Est Realization Costs', numeric: true },
  { key: 'costToComplete', label: 'Cost to Complete', numeric: true },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-other-cost-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './other-cost-capture.component.html',
  styleUrl: './other-cost-capture.component.css',
})
export class OtherCostCaptureComponent implements OnInit {
  private readonly otherCostApi = inject(OtherCostCaptureApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = OTHER_COST_TABLE_COLUMNS;

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly searchText = signal('');
  readonly sortColumn = signal<OtherCostColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<OtherCostRow[]>([]);
  readonly originalRowState = signal<Record<string, EditableCosts>>({});

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
    const selectedIds = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((alias) => selectedIds.has(alias.loanAliasId));
  });

  readonly aliasSelectOptions = computed(() =>
    this.aliasOptions().map((alias) => ({
      label: alias.loanAliasName,
      value: alias.loanAliasId,
    })),
  );

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  readonly searchedAliasOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedIds = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((alias) => {
      if (selectedIds.has(alias.loanAliasId)) {
        return false;
      }
      return alias.loanAliasName.toLowerCase().includes(keyword);
    });
  });

  readonly filteredRows = computed(() => {
    const selectedIds = this.selectedLoanAliasIds();
    const keyword = this.searchText();
    const selectedAliasNames = new Set(
      this.selectedAliases().map((alias) => alias.loanAliasName.trim().toLowerCase()),
    );

    let rows = this.rows();

    if (selectedIds.length > 0) {
      rows = rows.filter((row) =>
        selectedAliasNames.has(row.loanAliasName.trim().toLowerCase()),
      );
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

  updateSelectedAliases(ids: number[] | null): void {
    this.selectedLoanAliasIds.set(ids ?? []);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  selectAlias(alias: AliasOption): void {
    if (this.selectedLoanAliasIds().includes(alias.loanAliasId)) {
      return;
    }
    this.selectedLoanAliasIds.set([...this.selectedLoanAliasIds(), alias.loanAliasId]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedAlias(loanAliasId: number): void {
    this.selectedLoanAliasIds.set(
      this.selectedLoanAliasIds().filter((id) => id !== loanAliasId),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  toggleSort(column: OtherCostColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: OtherCostColumnKey): string {
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

  updateCostField(loanCode: string, field: keyof EditableCosts, rawValue: string): void {
    const parsed = this.parseCurrencyInput(rawValue);
    this.rows.set(
      this.rows().map((row) => (row.loanCode === loanCode ? { ...row, [field]: parsed } : row)),
    );
    this.clearMessages();
  }

  formatCurrencyInput(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim()) {
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

  getCellDisplayValue(row: OtherCostRow, column: OtherCostColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'outstandingInvoices':
        return this.formatCurrencyInput(row.outstandingInvoices);
      case 'estRealizationCosts':
        return this.formatCurrencyInput(row.estRealizationCosts);
      case 'costToComplete':
        return this.formatCurrencyInput(row.costToComplete);
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanAliasIds.set([]);
    this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
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

    const request: OtherCostCaptureBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        loanCode: row.loanCode,
        outstandingInvoices: row.outstandingInvoices,
        estRealizationCosts: row.estRealizationCosts,
        costToComplete: row.costToComplete,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.otherCostApi.saveCosts(request).subscribe({
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
        this.aliasOptions.set(
          aliases
            .map((record) => ({
              loanAliasId: Number(record.loanAliasId ?? record.loanAliasKey ?? 0),
              loanAliasName: record.loanAliasName?.trim() ?? '',
            }))
            .filter((alias) => alias.loanAliasId > 0 && alias.loanAliasName.length > 0)
            .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName)),
        );
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
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

    if (!statuses.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('Select at least one status to load loans.');
      return;
    }

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.otherCostApi.getLoans(statuses).subscribe({
      next: (records) => {
        const mapped = records.map((record) => this.mapRow(record));
        this.rows.set(mapped);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mapped.length > 0
            ? `${mapped.length} loan(s) loaded.`
            : 'No loans returned for the selected filters.',
        );
        this.isLoadingGrid.set(false);
      },
      error: (error) => {
        this.rows.set([]);
        this.originalRowState.set({});
        this.statusMessage.set('');
        this.errorMessage.set(this.extractBackendError(error));
        this.isLoadingGrid.set(false);
      },
    });
  }

  private mapRow(record: OtherCostCaptureRowDto): OtherCostRow {
    const loanCode = record.loanId?.trim() || '';
    return {
      loanKey: Number(record.loanKey) > 0 ? Number(record.loanKey) : 0,
      loanCode: loanCode || '-',
      loanName: record.description?.trim() || '—',
      loanAliasName: record.loanAliasName?.trim() || '—',
      outstandingInvoices: this.toNumber(record.outstandingInvoices),
      estRealizationCosts: this.toNumber(record.estRealizationCosts),
      costToComplete: this.toNumber(record.costToComplete),
      userUpdatedBy: record.userUpdatedBy?.trim() ?? '',
      userUpdatedDate: record.userUpdatedDate ?? '',
    };
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

  private snapshotOriginalState(): void {
    const snapshot: Record<string, EditableCosts> = {};
    for (const row of this.rows()) {
      snapshot[row.loanCode] = {
        outstandingInvoices: row.outstandingInvoices,
        estRealizationCosts: row.estRealizationCosts,
        costToComplete: row.costToComplete,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private revertUnsavedChanges(): void {
    const original = this.originalRowState();
    this.rows.update((rows) =>
      rows.map((row) => {
        const snapshot = original[row.loanCode];
        if (!snapshot) {
          return row;
        }
        return {
          ...row,
          outstandingInvoices: snapshot.outstandingInvoices,
          estRealizationCosts: snapshot.estRealizationCosts,
          costToComplete: snapshot.costToComplete,
        };
      }),
    );
  }

  private hasRowChanged(row: OtherCostRow): boolean {
    const original = this.originalRowState()[row.loanCode];
    if (!original) {
      return true;
    }
    return (
      !this.numbersEqual(row.outstandingInvoices, original.outstandingInvoices) ||
      !this.numbersEqual(row.estRealizationCosts, original.estRealizationCosts) ||
      !this.numbersEqual(row.costToComplete, original.costToComplete)
    );
  }

  private numbersEqual(a: number | null, b: number | null): boolean {
    return a === b || (a == null && b == null);
  }

  private parseCurrencyInput(value: string): number | null {
    const trimmed = value.replace(/[$,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumber(value: unknown): number | null {
    if (value == null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private compareRows(
    left: OtherCostRow,
    right: OtherCostRow,
    column: OtherCostColumnKey,
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
      case 'outstandingInvoices':
        return (left.outstandingInvoices ?? 0) - (right.outstandingInvoices ?? 0);
      case 'estRealizationCosts':
        return (left.estRealizationCosts ?? 0) - (right.estRealizationCosts ?? 0);
      case 'costToComplete':
        return (left.costToComplete ?? 0) - (right.costToComplete ?? 0);
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
    const fallback = 'Failed to load or save other cost capture data.';
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
