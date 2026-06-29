import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LoanSecurityValueApiService,
  LoanSecurityValueBulkUpdateRequest,
  LoanSecurityValueDto,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type EditableValues = {
  securityValue: number | null;
  units: number | null;
  squareFeet: number | null;
  acres: number | null;
};

type SecurityValueRow = {
  loanAliasId: number;
  loanAliasName: string;
  collateralPerYardi: number | null;
} & EditableValues & {
    updatedBy: string;
    updatedDtm: string;
  };

type SecurityValueColumnKey =
  | 'loanAliasName'
  | 'collateralPerYardi'
  | 'securityValue'
  | 'units'
  | 'squareFeet'
  | 'acres'
  | 'updatedBy'
  | 'updatedDtm';

type SecurityValueTableColumn = {
  key: SecurityValueColumnKey;
  label: string;
  numeric?: boolean;
};

const SECURITY_VALUE_TABLE_COLUMNS: SecurityValueTableColumn[] = [
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'collateralPerYardi', label: 'Collateral Per Yardi', numeric: true },
  { key: 'securityValue', label: 'Security Value', numeric: true },
  { key: 'units', label: 'Units', numeric: true },
  { key: 'squareFeet', label: 'SF', numeric: true },
  { key: 'acres', label: 'Acres', numeric: true },
  { key: 'updatedBy', label: 'Modified By' },
  { key: 'updatedDtm', label: 'Modified Date' },
];

/** displayLabel from API for default grid filter (dim_status). */
const DEFAULT_STATUS_LABEL = 'Default';

@Component({
  selector: 'app-security-value',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security-value.component.html',
  styleUrl: './security-value.component.css',
})
export class SecurityValueComponent implements OnInit {
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = SECURITY_VALUE_TABLE_COLUMNS;

  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly searchText = signal('');
  readonly sortColumn = signal<SecurityValueColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  /** status_key values sent as statuses= query params (e.g. "2", "(null)"). */
  readonly selectedStatuses = signal<string[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingAliases = signal(false);
  readonly isLoadingStatuses = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly rows = signal<SecurityValueRow[]>([]);
  readonly originalRowState = signal<Record<number, EditableValues>>({});

  ngOnInit(): void {
    this.loadInitialData();
  }

  readonly isLoading = computed(
    () => this.isLoadingAliases() || this.isLoadingGrid() || this.isLoadingStatuses(),
  );

  readonly selectedAliases = computed(() => {
    const selectedIds = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((alias) => selectedIds.has(alias.loanAliasId));
  });

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
    let rows = this.rows();

    if (selectedIds.length > 0) {
      const selectedIdSet = new Set(selectedIds);
      rows = rows.filter((row) => selectedIdSet.has(row.loanAliasId));
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

  toggleSort(column: SecurityValueColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: SecurityValueColumnKey): string {
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

  getCellDisplayValue(row: SecurityValueRow, column: SecurityValueColumnKey): string {
    switch (column) {
      case 'loanAliasName':
        return row.loanAliasName;
      case 'collateralPerYardi':
        return this.formatCurrency(row.collateralPerYardi);
      case 'securityValue':
        return this.formatCurrency(row.securityValue);
      case 'units':
        return this.formatIntegerDisplay(row.units);
      case 'squareFeet':
        return this.formatDecimalDisplay(row.squareFeet);
      case 'acres':
        return this.formatDecimalDisplay(row.acres);
      case 'updatedBy':
        return this.displayModifiedBy(row.updatedBy);
      case 'updatedDtm':
        return this.formatModifiedDate(row.updatedDtm);
      default:
        return '';
    }
  }

  selectAlias(alias: AliasOption): void {
    if (this.selectedLoanAliasIds().includes(alias.loanAliasId)) {
      return;
    }

    this.selectedLoanAliasIds.set([...this.selectedLoanAliasIds(), alias.loanAliasId]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGridData();
  }

  removeSelectedAlias(loanAliasId: number): void {
    this.selectedLoanAliasIds.set(
      this.selectedLoanAliasIds().filter((id) => id !== loanAliasId),
    );
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGridData();
  }

  toggleStatus(status: string): void {
    const current = this.selectedStatuses();
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    this.selectedStatuses.set(next);
    this.clearMessages();
    this.loadGridData();
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses().includes(status);
  }

  updateField(
    loanAliasId: number,
    field: keyof EditableValues,
    value: number | null,
  ): void {
    this.rows.set(
      this.rows().map((row) =>
        row.loanAliasId === loanAliasId ? { ...row, [field]: value } : row,
      ),
    );
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanAliasIds.set([]);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGridData();
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

  formatCurrency(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatSecurityValueInput(value: number | null): string {
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

  formatIntegerDisplay(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatDecimalDisplay(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4,
    }).format(value);
  }

  updateSecurityValueInput(loanAliasId: number, rawValue: string): void {
    this.updateField(loanAliasId, 'securityValue', this.parseCurrencyInput(rawValue));
  }

  updateNumericField(
    loanAliasId: number,
    field: 'units' | 'squareFeet' | 'acres',
    rawValue: string,
  ): void {
    this.updateField(loanAliasId, field, this.parseNumericInput(rawValue));
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const targetRows = this.filteredRows();
    if (!targetRows.length) {
      this.statusMessage.set('Select at least one loan alias to load data before saving.');
      return;
    }

    const changedRows = targetRows.filter((row) => this.hasRowChanged(row));
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const updatedBy = this.currentAppUser.getUpdatedBy();
    if (!updatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const request: LoanSecurityValueBulkUpdateRequest = {
      loanSecurityValues: changedRows.map((row) => ({
        loanAliasId: row.loanAliasId,
        securityValue: row.securityValue,
        units: row.units,
        squareFeet: row.squareFeet,
        acres: row.acres,
        updatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.securityValueApi.saveSecurityValues(request).subscribe({
      next: () => {
        this.snapshotOriginalState();
        this.statusMessage.set(`${changedRows.length} loan alias(es) updated successfully.`);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadGridData();
      },
      error: (error) => {
        this.statusMessage.set('');
        this.errorMessage.set(this.extractBackendError(error, 'save'));
        this.isSaving.set(false);
      },
    });
  }

  private loadInitialData(): void {
    this.isLoadingStatuses.set(true);
    this.isLoadingAliases.set(true);
    this.errorMessage.set('');

    forkJoin({
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
      aliases: this.loanAliasApi.getAll().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ statuses, aliases }) => {
        const statusOptions = this.normalizeStatusOptions(statuses);
        this.statusOptions.set(statusOptions);
        this.selectedStatuses.set(this.resolveDefaultStatusValues(statusOptions));
        this.isLoadingStatuses.set(false);

        if (!statusOptions.length) {
          this.errorMessage.set(
            'No funding statuses returned. Add rows to mort.dim_status (is_current = 1) and restart the API.',
          );
        }

        this.aliasOptions.set(
          aliases
            .map((record) => this.mapAliasOption(record))
            .filter((alias) => alias.loanAliasId > 0),
        );
        this.isLoadingAliases.set(false);

        if (!this.aliasOptions().length) {
          this.errorMessage.set(
            'Unable to load loan alias list. Search tags are unavailable until GET /api/LoanAlias succeeds.',
          );
        }

        this.loadGridData();
      },
      error: () => {
        this.statusOptions.set([]);
        this.selectedStatuses.set([]);
        this.aliasOptions.set([]);
        this.isLoadingStatuses.set(false);
        this.isLoadingAliases.set(false);
        this.errorMessage.set('Unable to load Security Value page data. Verify API availability.');
      },
    });
  }

  private normalizeStatusOptions(statuses: unknown): LoanStatusFilterOption[] {
    if (!Array.isArray(statuses) || !statuses.length) {
      return [];
    }
    if (typeof statuses[0] === 'string') {
      return (statuses as string[])
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => ({ value: s, displayLabel: s }));
    }
    return (statuses as Record<string, unknown>[])
      .map((row) => {
        const value = String(row['value'] ?? row['statusKey'] ?? row['status_key'] ?? '').trim();
        const displayLabel = String(
          row['displayLabel'] ?? row['statusName'] ?? row['status_name'] ?? value,
        ).trim();
        return { value, displayLabel: displayLabel || value };
      })
      .filter((row) => row.value.length > 0 || row.displayLabel.length > 0);
  }

  private resolveDefaultStatusValues(options: LoanStatusFilterOption[]): string[] {
    if (!options.length) {
      return [];
    }
    const preferred = options.find(
      (o) =>
        o.displayLabel.toLowerCase() === DEFAULT_STATUS_LABEL.toLowerCase() ||
        o.value === '2',
    );
    const fallback = options.find((o) => o.value !== '(null)') ?? options[0];
    return [preferred?.value ?? fallback.value];
  }

  /** Tag selection reloads the grid; empty selection loads all aliases from the API. */
  private loadGridData(): void {
    const loanAliasIds = this.selectedLoanAliasIds();

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('Loading security values...');

    this.securityValueApi
      .getSecurityValues(loanAliasIds, this.selectedStatuses())
      .subscribe({
        next: (records) => {
          const mappedRows = records
            .map((record) => this.mapSecurityValueToRow(record))
            .filter((row) => row.loanAliasId > 0);

          this.rows.set(mappedRows);
          this.currentPage.set(1);
          this.snapshotOriginalState();
          this.statusMessage.set(
            mappedRows.length > 0
              ? `${mappedRows.length} row(s) loaded.`
              : 'No security value rows returned for the selected filters.',
          );
          this.isLoadingGrid.set(false);
        },
        error: (error) => {
          this.rows.set([]);
          this.originalRowState.set({});
          this.statusMessage.set('');
          this.errorMessage.set(this.extractBackendError(error, 'load'));
          this.isLoadingGrid.set(false);
        },
      });
  }

  private mapAliasOption(record: LoanAlias): AliasOption {
    const loanAliasId = Number(record.loanAliasId ?? record.loanAliasKey ?? 0);
    return {
      loanAliasId,
      loanAliasName: record.loanAliasName?.trim() || '-',
    };
  }

  private mapSecurityValueToRow(record: LoanSecurityValueDto): SecurityValueRow {
    const loanAliasId = Number(record.loanAliasId ?? record.loanAliasKey ?? 0);
    const collateralPerYardi = this.toNumber(
      record.collateralPerYardi ?? record.collateralValue,
    );
    const storedSecurity = this.toNumber(record.securityValue);

    return {
      loanAliasId,
      loanAliasName: record.loanAliasName?.trim() || '-',
      collateralPerYardi,
      securityValue: storedSecurity ?? collateralPerYardi,
      units: this.toNumber(record.units),
      squareFeet: this.toNumber(
        record.squareFeet ?? (record as { square_feet?: number | null }).square_feet,
      ),
      acres: this.toNumber(record.acres),
      updatedBy:
        record.updatedBy?.trim() || record.userUpdatedBy?.trim() || '',
      updatedDtm: this.coerceDateString(record.updatedDtm ?? record.userUpdatedDate ?? ''),
    };
  }

  private compareRows(
    left: SecurityValueRow,
    right: SecurityValueRow,
    column: SecurityValueColumnKey,
  ): number {
    switch (column) {
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'collateralPerYardi':
        return (left.collateralPerYardi ?? 0) - (right.collateralPerYardi ?? 0);
      case 'securityValue':
        return (left.securityValue ?? 0) - (right.securityValue ?? 0);
      case 'units':
        return (left.units ?? 0) - (right.units ?? 0);
      case 'squareFeet':
        return (left.squareFeet ?? 0) - (right.squareFeet ?? 0);
      case 'acres':
        return (left.acres ?? 0) - (right.acres ?? 0);
      case 'updatedBy':
        return left.updatedBy.localeCompare(right.updatedBy, undefined, { sensitivity: 'base' });
      case 'updatedDtm':
        return this.dateSortValue(left.updatedDtm) - this.dateSortValue(right.updatedDtm);
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

  private coerceDateString(value: unknown): string {
    if (value == null || value === '') {
      return '';
    }
    return String(value);
  }

  private parseCurrencyInput(value: string): number | null {
    const trimmed = value.replace(/[$,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<number, EditableValues> = {};
    for (const row of this.rows()) {
      snapshot[row.loanAliasId] = {
        securityValue: row.securityValue,
        units: row.units,
        squareFeet: row.squareFeet,
        acres: row.acres,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private hasRowChanged(row: SecurityValueRow): boolean {
    const original = this.originalRowState()[row.loanAliasId];
    if (!original) {
      return true;
    }
    return (
      !this.numbersEqual(row.securityValue, original.securityValue) ||
      !this.numbersEqual(row.units, original.units) ||
      !this.numbersEqual(row.squareFeet, original.squareFeet) ||
      !this.numbersEqual(row.acres, original.acres)
    );
  }

  private numbersEqual(a: number | null, b: number | null): boolean {
    return a === b || (a == null && b == null);
  }

  private parseNumericInput(value: string): number | null {
    const trimmed = value.replace(/,/g, '').trim();
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

  private extractBackendError(error: unknown, action: 'load' | 'save' = 'save'): string {
    const fallback =
      action === 'load'
        ? 'Unable to load security values (server error). Check API logs and loan_alias_master column names (units, square_feet, acres).'
        : 'Failed to update security value changes.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as {
      status?: number;
      error?: { message?: string; title?: string; detail?: string } | string;
      message?: string;
    };

    if (typeof maybeError.error === 'string' && maybeError.error.trim().length > 0) {
      const detail = maybeError.error.trim();
      return maybeError.status === 500
        ? `Server error (500): ${detail}`
        : detail;
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
