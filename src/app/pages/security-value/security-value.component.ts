import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { buildMortgageGridLoadMessage } from '../../core/utils/mortgage-grid-load-message.util';
import {
  formatCurrencyDisplay,
  parseCurrencyInput,
  parseNumericInput,
} from '../../core/utils/mortgage-currency-input.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LoanSecurityValueApiService,
  LoanSecurityValueBulkUpdateRequest,
  LoanSecurityValueDto,
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
  audit?: boolean;
};

const SECURITY_VALUE_TABLE_COLUMNS: SecurityValueTableColumn[] = [
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'collateralPerYardi', label: 'Collateral Per Yardi', numeric: true },
  { key: 'securityValue', label: 'Security Value', numeric: true },
  { key: 'units', label: 'Units', numeric: true },
  { key: 'squareFeet', label: 'SF', numeric: true },
  { key: 'acres', label: 'Acres', numeric: true },
  { key: 'updatedBy', label: 'Modified By', audit: true },
  { key: 'updatedDtm', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-security-value',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './security-value.component.html',
  styleUrl: './security-value.component.css',
})
export class SecurityValueComponent implements OnInit {
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = SECURITY_VALUE_TABLE_COLUMNS;

  readonly searchText = signal('');
  readonly sortColumn = signal<SecurityValueColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingAliases = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly rows = signal<SecurityValueRow[]>([]);
  /** Raw in-progress text for numeric/currency inputs (avoids reformat-on-keystroke). */
  readonly fieldText = signal<Record<string, string>>({});
  readonly originalRowState = signal<Record<number, EditableValues>>({});
  /** Ignores the empty search emit ng-select fires right after selecting a chip. */
  private suppressEmptySearchClear = false;

  ngOnInit(): void {
    this.loadInitialData();
  }

  readonly isLoading = computed(
    () => this.isLoadingAliases() || this.isLoadingGrid(),
  );

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

  readonly gridLoadMessage = computed(() =>
    buildMortgageGridLoadMessage({
      isLoading: this.isLoadingGrid() || this.isLoadingAliases(),
      totalRows: this.rows().length,
      visibleRows: this.filteredRows().length,
      hasClientFilter:
        this.selectedLoanAliasIds().length > 0 || this.searchText().trim().length > 0,
      entitySingular: 'row',
      emptyMessage: 'No security value rows returned for the selected filters.',
    }),
  );

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

  /** Live typeahead → grid filter (keeps last term when ng-select clears search after a chip select). */
  onLoanSearch(event: { term: string } | string | null): void {
    const term = typeof event === 'string' ? event : (event?.term ?? '');
    if (!term.trim() && this.suppressEmptySearchClear) {
      return;
    }
    this.updateSearch(term);
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

  updateSelectedAliases(ids: number[] | null): void {
    this.suppressEmptySearchClear = true;
    this.selectedLoanAliasIds.set(ids ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGridData();
    queueMicrotask(() => {
      this.suppressEmptySearchClear = false;
    });
  }


  selectAlias(alias: AliasOption): void {
    if (this.selectedLoanAliasIds().includes(alias.loanAliasId)) {
      return;
    }

    this.updateSelectedAliases([...this.selectedLoanAliasIds(), alias.loanAliasId]);
    this.searchText.set('');
  }

  removeSelectedAlias(loanAliasId: number): void {
    this.updateSelectedAliases(
      this.selectedLoanAliasIds().filter((id) => id !== loanAliasId),
    );
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
    return formatCurrencyDisplay(value, 0);
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

  fieldInputDisplay(
    loanAliasId: number,
    field: keyof EditableValues,
    value: number | null,
  ): string {
    const key = `${loanAliasId}|${field}`;
    const pending = this.fieldText()[key];
    if (pending !== undefined) {
      return pending;
    }
    if (field === 'securityValue') {
      return formatCurrencyDisplay(value, 0);
    }
    if (field === 'units') {
      return this.formatIntegerDisplay(value);
    }
    return this.formatDecimalDisplay(value);
  }

  onFieldInput(loanAliasId: number, field: keyof EditableValues, rawValue: string): void {
    const key = `${loanAliasId}|${field}`;
    this.fieldText.update((current) => ({ ...current, [key]: rawValue }));
    this.clearMessages();
  }

  commitField(loanAliasId: number, field: keyof EditableValues, input: HTMLInputElement): void {
    const key = `${loanAliasId}|${field}`;
    const raw = this.fieldText()[key] ?? input.value;
    const parsed =
      field === 'securityValue'
        ? parseCurrencyInput(raw)
        : field === 'units'
          ? parseNumericInput(raw, false)
          : parseNumericInput(raw, true);
    this.updateField(loanAliasId, field, parsed);
    this.fieldText.update((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    input.value = this.fieldInputDisplay(loanAliasId, field, parsed);
  }

  updateSecurityValueInput(loanAliasId: number, rawValue: string): void {
    this.onFieldInput(loanAliasId, 'securityValue', rawValue);
  }

  updateNumericField(
    loanAliasId: number,
    field: 'units' | 'squareFeet' | 'acres',
    rawValue: string,
  ): void {
    this.onFieldInput(loanAliasId, field, rawValue);
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
    this.isLoadingAliases.set(true);
    this.errorMessage.set('');

    this.loanAliasApi.getAll().pipe(catchError(() => of([]))).subscribe({
      next: (aliases) => {
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
        this.aliasOptions.set([]);
        this.isLoadingAliases.set(false);
        this.errorMessage.set('Unable to load Security Value page data. Verify API availability.');
      },
    });
  }

  /** Selected alias tags, or all aliases when none selected. */
  private resolveLoanAliasIds(): number[] {
    const selected = this.selectedLoanAliasIds();
    if (selected.length > 0) {
      return selected;
    }
    return this.aliasOptions()
      .map((alias) => alias.loanAliasId)
      .filter((id) => id > 0);
  }

  /** Tag selection reloads the grid; empty selection loads all aliases from the API. */
  private loadGridData(): void {
    const loanAliasIds = this.resolveLoanAliasIds();

    if (!loanAliasIds.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('No loan aliases available to load.');
      this.isLoadingGrid.set(false);
      return;
    }


    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.securityValueApi
      .getSecurityValues(loanAliasIds, [])
      .subscribe({
        next: (response) => {
          const records = this.normalizeSecurityValueRecords(response);
          const mappedRows = records
            .map((record) => this.mapSecurityValueToRow(record))
            .filter((row) => row.loanAliasId > 0);

          this.rows.set(mappedRows);
          this.fieldText.set({});
          this.currentPage.set(1);
          this.snapshotOriginalState();
          this.statusMessage.set('');
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

  private normalizeSecurityValueRecords(response: unknown): LoanSecurityValueDto[] {
    if (Array.isArray(response)) {
      return response as LoanSecurityValueDto[];
    }
    if (response && typeof response === 'object') {
      const candidate = response as Record<string, unknown>;
      for (const key of ['data', 'records', 'items', 'loanSecurityValues', 'results']) {
        const value = candidate[key];
        if (Array.isArray(value)) {
          return value as LoanSecurityValueDto[];
        }
      }
    }
    return [];
  }

  private mapAliasOption(record: LoanAlias): AliasOption {
    const raw = record as LoanAlias & Record<string, unknown>;
    const loanAliasId = Number(
      raw.loanAliasId ?? raw.loanAliasKey ?? raw['loan_alias_id'] ?? raw['loan_alias_key'] ?? 0,
    );
    return {
      loanAliasId,
      loanAliasName: record.loanAliasName?.trim() || '-',
    };
  }

  private mapSecurityValueToRow(record: LoanSecurityValueDto): SecurityValueRow {
    const raw = record as LoanSecurityValueDto & Record<string, unknown>;
    const loanAliasId = Number(
      raw.loanAliasId ?? raw.loanAliasKey ?? raw['loan_alias_id'] ?? raw['loan_alias_key'] ?? 0,
    );
    const collateralPerYardi = this.toNumber(
      raw.collateralPerYardi ?? raw.collateralValue ?? raw['collateral_per_yardi'],
    );
    const storedSecurity = this.toNumber(raw.securityValue ?? raw['security_value']);

    return {
      loanAliasId,
      loanAliasName: String(raw.loanAliasName ?? raw['loan_alias_name'] ?? '').trim() || '-',
      collateralPerYardi,
      securityValue: storedSecurity ?? collateralPerYardi,
      units: this.toNumber(raw.units),
      squareFeet: this.toNumber(
        raw.squareFeet ?? raw['square_feet'] ?? (raw as { sf?: number | null }).sf,
      ),
      acres: this.toNumber(raw.acres),
      updatedBy:
        String(raw.updatedBy ?? raw.userUpdatedBy ?? raw['updated_by'] ?? '').trim() || '',
      updatedDtm: this.coerceDateString(
        raw.updatedDtm ?? raw.userUpdatedDate ?? raw['updated_dtm'] ?? raw['user_updated_date'] ?? '',
      ),
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
