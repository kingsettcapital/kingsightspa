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
import { LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import { LoanDto, LoansApiService } from '../../core/services/loans-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';
import {
  TaxArrearsCaptureApiService,
  TaxArrearsCaptureBulkUpdateRequest,
  TaxArrearsCaptureCreateRequest,
  TaxArrearsCaptureRowDto,
} from '../../core/services/tax-arrears-capture-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type TaxArrearRow = {
  stableRowId: string;
  taxArrearKey: number;
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasName: string;
  taxMemoDate: string;
  taxArrears: number | null;
  taxYear: string;
  notes: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = {
  taxMemoDate: string;
  taxArrears: number | null;
  taxYear: string;
  notes: string;
};

type NewRecordForm = {
  loanAliasId: number | null;
  loanCode: string | null;
  taxMemoDate: string;
  taxYear: string;
  taxArrears: string;
  notes: string;
};

type TaxArrearColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'taxMemoDate'
  | 'taxArrears'
  | 'taxYear'
  | 'notes'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type TaxArrearTableColumn = {
  key: TaxArrearColumnKey;
  label: string;
  editable?: boolean;
  numeric?: boolean;
  audit?: boolean;
};

const TAX_ARREAR_TABLE_COLUMNS: TaxArrearTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'taxMemoDate', label: 'Tax Memo Date', editable: true },
  { key: 'taxArrears', label: 'Tax Arrears', editable: true, numeric: true },
  { key: 'taxYear', label: 'Tax Year', editable: true },
  { key: 'notes', label: 'Notes', editable: true },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-tax-arrears-capture',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './tax-arrears-capture.component.html',
  styleUrl: './tax-arrears-capture.component.css',
})
export class TaxArrearsCaptureComponent implements OnInit {
  private readonly taxArrearsApi = inject(TaxArrearsCaptureApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly loansApi = inject(LoansApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = TAX_ARREAR_TABLE_COLUMNS;

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly taxYearOptions = signal<string[]>([]);
  readonly allLoans = signal<LoanDto[]>([]);
  readonly searchText = signal('');
  readonly sortColumn = signal<TaxArrearColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanCodes = signal<string[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<TaxArrearRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly isCreating = signal(false);
  readonly showAddDialog = signal(false);
  readonly dialogError = signal('');
  readonly newRecord = signal<NewRecordForm>(this.emptyNewRecord());
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  ngOnInit(): void {
    this.loadFilters();
  }

  readonly searchedLoanOptions = computed(() => {
    const keyword = this.searchText();
    if (!keyword.trim()) {
      return [];
    }

    const selectedCodes = new Set(this.selectedLoanCodes());
    const seen = new Set<string>();
    const matches: TaxArrearRow[] = [];

    for (const row of this.rows()) {
      if (selectedCodes.has(row.loanCode) || seen.has(row.loanCode)) {
        continue;
      }
      if (
        filterRowsByTableSearch(
          [row],
          keyword,
          this.tableColumns,
          (candidate, key) => this.getCellDisplayValue(candidate, key),
        ).length > 0
      ) {
        seen.add(row.loanCode);
        matches.push(row);
      }
    }

    return matches.sort((left, right) => left.loanCode.localeCompare(right.loanCode));
  });

  readonly selectedLoans = computed(() => {
    const selectedCodes = new Set(this.selectedLoanCodes());
    const seen = new Set<string>();
    return this.rows().filter((row) => {
      if (!selectedCodes.has(row.loanCode) || seen.has(row.loanCode)) {
        return false;
      }
      seen.add(row.loanCode);
      return true;
    });
  });

  readonly aliasSelectOptions = computed(() => {
    const seenCodes = new Set<string>();
    return this.allLoans()
      .map((loan) => {
        const loanCode = loan.loanCode?.trim() ?? '';
        if (!loanCode || seenCodes.has(loanCode)) {
          return null;
        }
        seenCodes.add(loanCode);
        const loanName = loan.loanDesc?.trim() || '—';
        return {
          label: `${loanCode} — ${loanName}`,
          value: loanCode,
        };
      })
      .filter((v): v is { label: string; value: string } => Boolean(v))
      .sort((a, b) => a.value.localeCompare(b.value));
  });

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  readonly modalLoanOptions = computed(() => {
    const aliasId = this.newRecord().loanAliasId;
    if (!aliasId) {
      return [];
    }

    const alias = this.aliasOptions().find((option) => option.loanAliasId === aliasId);
    if (!alias) {
      return [];
    }

    const aliasName = alias.loanAliasName.trim().toLowerCase();
    return this.allLoans()
      .filter((loan) => {
        const keyMatch = Number(loan.loanAliasKey ?? 0) === aliasId;
        const nameMatch = (loan.loanAliasName?.trim().toLowerCase() ?? '') === aliasName;
        return keyMatch || nameMatch;
      })
      .map((loan) => ({
        loanCode: loan.loanCode?.trim() || '',
        loanName: loan.loanDesc?.trim() || '—',
        loanKey: Number(loan.loanKey) > 0 ? Number(loan.loanKey) : 0,
      }))
      .filter((loan) => loan.loanCode.length > 0)
      .sort((left, right) => left.loanCode.localeCompare(right.loanCode));
  });

  readonly modalLoanPreview = computed(() => {
    const loanCode = this.newRecord().loanCode;
    if (!loanCode) {
      return { loanCode: '—', loanName: '—' };
    }
    const loan = this.modalLoanOptions().find((option) => option.loanCode === loanCode);
    return {
      loanCode: loan?.loanCode ?? loanCode,
      loanName: loan?.loanName ?? '—',
    };
  });

  readonly filteredRows = computed(() => {
    const selectedCodes = this.selectedLoanCodes();
    const keyword = this.searchText();

    let rows = this.rows();

    if (selectedCodes.length > 0) {
      const codeSet = new Set(selectedCodes);
      rows = rows.filter((row) => codeSet.has(row.loanCode));
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

  rowTrackId(row: TaxArrearRow): string {
    return row.stableRowId;
  }

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateSelectedAliases(codes: string[] | null): void {
    this.selectedLoanCodes.set(codes ?? []);
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

  selectLoan(row: TaxArrearRow): void {
    if (this.selectedLoanCodes().includes(row.loanCode)) {
      return;
    }
    this.selectedLoanCodes.set([...this.selectedLoanCodes(), row.loanCode]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedLoan(loanCode: string): void {
    this.selectedLoanCodes.set(this.selectedLoanCodes().filter((code) => code !== loanCode));
    this.currentPage.set(1);
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanCodes.set([]);
    this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  toggleSort(column: TaxArrearColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: TaxArrearColumnKey): string {
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

  updateTaxMemoDate(rowId: string, value: string): void {
    this.patchRow(rowId, { taxMemoDate: value.trim() });
  }

  updateTaxArrears(rowId: string, value: string): void {
    this.patchRow(rowId, { taxArrears: this.parseCurrencyInput(value) });
  }

  formatTaxArrearsInput(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  updateTaxYear(rowId: string, value: string): void {
    this.patchRow(rowId, { taxYear: value.trim() });
  }

  updateNotes(rowId: string, value: string): void {
    this.patchRow(rowId, { notes: value });
  }

  openAddDialog(): void {
    this.newRecord.set(this.emptyNewRecord());
    this.dialogError.set('');
    this.showAddDialog.set(true);
  }

  closeAddDialog(): void {
    this.showAddDialog.set(false);
    this.dialogError.set('');
  }

  updateNewRecordAlias(value: string): void {
    const parsed = Number(value);
    const loanAliasId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.newRecord.set({
      ...this.newRecord(),
      loanAliasId,
      loanCode: null,
    });
    this.dialogError.set('');
  }

  updateNewRecordLoan(value: string): void {
    const loanCode = value?.trim() || null;
    this.newRecord.set({ ...this.newRecord(), loanCode });
    this.dialogError.set('');
  }

  updateNewRecordField(field: keyof NewRecordForm, value: string): void {
    this.newRecord.set({ ...this.newRecord(), [field]: value });
    this.dialogError.set('');
  }

  createRecord(): void {
    if (this.isCreating()) {
      return;
    }
    const form = this.newRecord();
    if (!form.loanCode) {
      this.dialogError.set('Select a loan for the new record.');
      return;
    }
    if (!form.taxYear.trim()) {
      this.dialogError.set('Tax year is required.');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.dialogError.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const selectedLoan = this.modalLoanOptions().find((loan) => loan.loanCode === form.loanCode);
    const request: TaxArrearsCaptureCreateRequest = {
      loanKey: selectedLoan?.loanKey ?? 0,
      loanCode: form.loanCode,
      taxMemoDate: form.taxMemoDate.trim() || null,
      taxArrears: this.parseCurrencyInput(form.taxArrears),
      taxYear: form.taxYear.trim() || null,
      notes: form.notes.trim() || null,
      userUpdatedBy,
    };

    this.isCreating.set(true);
    this.dialogError.set('');

    this.taxArrearsApi.createRecord(request).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeAddDialog();
        this.statusMessage.set('New tax arrears record added.');
        this.errorMessage.set('');
        this.loadGrid();
      },
      error: (error) => {
        this.isCreating.set(false);
        this.dialogError.set(this.extractBackendError(error, 'Failed to add tax arrears record.'));
      },
    });
  }

  saveChanges(): void {
    if (this.isSaving() || !this.rows().length) {
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
      return;
    }

    const request: TaxArrearsCaptureBulkUpdateRequest = {
      taxArrears: changedRows.map((row) => {
        const original = this.originalRowState()[this.rowTrackId(row)];
        return {
          taxArrearKey: row.taxArrearKey,
          loanCode: row.loanCode,
          originalTaxYear: original?.taxYear ?? row.taxYear,
          taxMemoDate: row.taxMemoDate.trim() || null,
          taxArrears: row.taxArrears,
          taxYear: row.taxYear.trim() || null,
          notes: row.notes.trim() || null,
          userUpdatedBy,
        };
      }),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.taxArrearsApi.saveRecords(request).subscribe({
      next: () => {
        this.snapshotOriginalState();
        this.statusMessage.set(`${changedRows.length} record(s) updated successfully.`);
        this.isSaving.set(false);
        this.loadGrid();
      },
      error: (error) => {
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

  getCellDisplayValue(row: TaxArrearRow, column: TaxArrearColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'taxMemoDate':
        return this.formatDisplayDate(row.taxMemoDate);
      case 'taxArrears':
        return this.formatTaxArrearsInput(row.taxArrears);
      case 'taxYear':
        return row.taxYear || '—';
      case 'notes':
        return row.notes || '—';
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  private emptyNewRecord(): NewRecordForm {
    return {
      loanAliasId: null,
      loanCode: null,
      taxMemoDate: '',
      taxYear: String(new Date().getFullYear()),
      taxArrears: '',
      notes: '',
    };
  }

  private patchRow(rowId: string, patch: Partial<TaxArrearRow>): void {
    this.rows.set(
      this.rows().map((row) => (this.rowTrackId(row) === rowId ? { ...row, ...patch } : row)),
    );
    this.clearMessages();
  }

  private loadFilters(): void {
    this.isLoadingFilters.set(true);
    this.errorMessage.set('');

    forkJoin({
      aliases: this.loanAliasApi.getAll().pipe(catchError(() => of([]))),
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
      loans: this.loansApi.getLoans().pipe(catchError(() => of([]))),
      lookups: this.taxArrearsApi.getLookups().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ aliases, statuses, loans, lookups }) => {
        this.aliasOptions.set(
          aliases
            .map((a) => ({
              loanAliasId: Number(a.loanAliasId ?? a.loanAliasKey ?? 0),
              loanAliasName: a.loanAliasName?.trim() || '-',
            }))
            .filter((a) => a.loanAliasId > 0)
            .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName)),
        );
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
        this.allLoans.set(Array.isArray(loans) ? loans : []);
        this.taxYearOptions.set(this.buildTaxYearOptions(lookups));
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
      this.statusMessage.set('Select at least one status to load records.');
      return;
    }

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.taxArrearsApi.getRecords(statuses).subscribe({
      next: (records) => {
        const mapped = records.map((record) => this.mapRow(record));
        this.rows.set(mapped);
        this.mergeTaxYearsFromRows(mapped);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mapped.length > 0
            ? `${mapped.length} record(s) loaded.`
            : 'No tax arrears records returned for the selected filters.',
        );
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

  private mapRow(record: TaxArrearsCaptureRowDto): TaxArrearRow {
    const raw = record as TaxArrearsCaptureRowDto & Record<string, unknown>;
    const taxArrearKey = this.pickNumber(raw, 'taxArrearKey', 'TaxArrearKey');
    const loanCode = this.pickString(raw, 'loanId', 'LoanId', 'loanCode', 'LoanCode') || '—';
    const taxYear = this.pickString(raw, 'taxYear', 'TaxYear');
    const stableRowId =
      taxArrearKey > 0 ? `key-${taxArrearKey}` : `loan-${loanCode}-year-${taxYear || 'none'}`;

    return {
      stableRowId,
      taxArrearKey,
      loanKey: this.pickNumber(raw, 'loanKey', 'LoanKey'),
      loanCode,
      loanName: this.pickString(raw, 'description', 'Description') || '—',
      loanAliasName: this.pickString(raw, 'loanAliasName', 'LoanAliasName') || '—',
      taxMemoDate: this.toDateInputValue(
        this.pickString(raw, 'taxMemoDate', 'TaxMemoDate') || null,
      ),
      taxArrears: this.pickNullableNumber(raw, 'taxArrears', 'TaxArrears'),
      taxYear,
      notes: this.pickString(raw, 'notes', 'Notes'),
      userUpdatedBy: this.pickString(raw, 'userUpdatedBy', 'UserUpdatedBy') || '',
      userUpdatedDate: this.pickString(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
  }

  private revertUnsavedChanges(): void {
    const original = this.originalRowState();
    this.rows.update((rows) =>
      rows.map((row) => {
        const snapshot = original[this.rowTrackId(row)];
        return snapshot ? { ...row, ...snapshot } : row;
      }),
    );
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, RowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[this.rowTrackId(row)] = this.rowSnapshot(row);
    }
    this.originalRowState.set(snapshot);
  }

  private rowSnapshot(row: TaxArrearRow): RowSnapshot {
    return {
      taxMemoDate: row.taxMemoDate,
      taxArrears: row.taxArrears,
      taxYear: row.taxYear,
      notes: row.notes,
    };
  }

  private hasRowChanged(row: TaxArrearRow): boolean {
    const original = this.originalRowState()[this.rowTrackId(row)];
    if (!original) {
      return true;
    }
    const current = this.rowSnapshot(row);
    return (
      current.taxMemoDate !== original.taxMemoDate ||
      current.taxArrears !== original.taxArrears ||
      current.taxYear !== original.taxYear ||
      current.notes !== original.notes
    );
  }

  private mergeTaxYearsFromRows(rows: TaxArrearRow[]): void {
    const years = new Set(this.taxYearOptions());
    for (const row of rows) {
      if (row.taxYear.trim()) {
        years.add(row.taxYear.trim());
      }
    }
    this.taxYearOptions.set([...years].sort((a, b) => Number(b) - Number(a)));
  }

  private buildTaxYearOptions(lookups: unknown): string[] {
    const years = new Set<string>();
    const current = new Date().getFullYear();
    for (let y = current + 1; y >= current - 15; y -= 1) {
      years.add(String(y));
    }
    if (lookups && typeof lookups === 'object') {
      const fromApi = (lookups as Record<string, unknown>)['taxYears'];
      if (Array.isArray(fromApi)) {
        for (const year of fromApi) {
          const normalized = String(year).trim();
          if (normalized) {
            years.add(normalized);
          }
        }
      }
    }
    return [...years].sort((a, b) => Number(b) - Number(a));
  }

  private compareRows(left: TaxArrearRow, right: TaxArrearRow, column: TaxArrearColumnKey): number {
    switch (column) {
      case 'loanCode':
        return left.loanCode.localeCompare(right.loanCode, undefined, { sensitivity: 'base' });
      case 'loanName':
        return left.loanName.localeCompare(right.loanName, undefined, { sensitivity: 'base' });
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'taxMemoDate':
        return this.dateSortValue(left.taxMemoDate) - this.dateSortValue(right.taxMemoDate);
      case 'taxArrears':
        return (left.taxArrears ?? 0) - (right.taxArrears ?? 0);
      case 'taxYear':
        return Number(left.taxYear) - Number(right.taxYear);
      case 'notes':
        return left.notes.localeCompare(right.notes, undefined, { sensitivity: 'base' });
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

  private parseCurrencyInput(value: string): number | null {
    const trimmed = value.replace(/[$,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private pickNumber(record: Record<string, unknown>, ...keys: string[]): number {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return 0;
  }

  private pickNullableNumber(
    record: Record<string, unknown>,
    ...keys: string[]
  ): number | null {
    for (const key of keys) {
      const value = record[key];
      if (value == null) {
        continue;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim());
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private pickString(record: Record<string, unknown>, ...keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }
    return '';
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

  private extractBackendError(error: unknown, fallback = 'Failed to load or save tax arrears data.'): string {
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
