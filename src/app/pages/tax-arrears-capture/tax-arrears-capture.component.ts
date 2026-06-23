import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  taxArrearKey: number;
  loanKey: number;
  loanId: string;
  description: string;
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
  loanKey: number | null;
  taxMemoDate: string;
  taxYear: string;
  taxArrears: string;
  notes: string;
};

const DEFAULT_STATUS_LABEL = 'Default';

@Component({
  selector: 'app-tax-arrears-capture',
  standalone: true,
  imports: [CommonModule],
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

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly taxYearOptions = signal<string[]>([]);
  readonly allLoans = signal<LoanDto[]>([]);
  readonly searchText = signal('');
  readonly selectedLoanAliasIds = signal<number[]>([]);
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

  readonly selectedAliases = computed(() => {
    const ids = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((a) => ids.has(a.loanAliasId));
  });

  readonly searchedAliasOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }
    const selectedIds = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter(
      (a) => !selectedIds.has(a.loanAliasId) && a.loanAliasName.toLowerCase().includes(keyword),
    );
  });

  readonly modalLoanOptions = computed(() => {
    const aliasId = this.newRecord().loanAliasId;
    if (!aliasId) {
      return [];
    }
    return this.allLoans()
      .filter((loan) => Number(loan.loanAliasKey ?? 0) === aliasId)
      .map((loan) => ({
        loanKey: Number(loan.loanKey),
        loanId: loan.loanCode?.trim() || '-',
        description: loan.loanDesc?.trim() || '-',
      }))
      .filter((loan) => loan.loanKey > 0)
      .sort((a, b) => a.loanId.localeCompare(b.loanId));
  });

  readonly modalLoanPreview = computed(() => {
    const loanKey = this.newRecord().loanKey;
    if (!loanKey) {
      return { loanId: '-', description: '-' };
    }
    const loan = this.modalLoanOptions().find((l) => l.loanKey === loanKey);
    return {
      loanId: loan?.loanId ?? '-',
      description: loan?.description ?? '-',
    };
  });

  readonly totalPages = computed(() => {
    const total = this.rows().length;
    return total === 0 ? 1 : Math.ceil(total / this.pageSize());
  });

  readonly paginatedRows = computed(() => {
    const rows = this.rows();
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
    const total = this.rows().length;
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
    if (row.taxArrearKey > 0) {
      return `key-${row.taxArrearKey}`;
    }
    return `loan-${row.loanKey}-year-${row.taxYear}`;
  }

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.clearMessages();
  }

  selectAlias(alias: AliasOption): void {
    if (this.selectedLoanAliasIds().includes(alias.loanAliasId)) {
      return;
    }
    this.selectedLoanAliasIds.set([...this.selectedLoanAliasIds(), alias.loanAliasId]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  removeSelectedAlias(loanAliasId: number): void {
    this.selectedLoanAliasIds.set(
      this.selectedLoanAliasIds().filter((id) => id !== loanAliasId),
    );
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  clearAliasSelection(): void {
    this.searchText.set('');
    this.selectedLoanAliasIds.set([]);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
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
    this.patchRow(rowId, { taxArrears: this.parseNumericInput(value) });
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
      loanKey: null,
    });
    this.dialogError.set('');
  }

  updateNewRecordLoan(value: string): void {
    const parsed = Number(value);
    const loanKey = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    this.newRecord.set({ ...this.newRecord(), loanKey });
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
    if (!form.loanKey) {
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

    const request: TaxArrearsCaptureCreateRequest = {
      loanKey: form.loanKey,
      taxMemoDate: form.taxMemoDate.trim() || null,
      taxArrears: this.parseNumericInput(form.taxArrears),
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

    const invalid = changedRows.find((row) => row.taxArrearKey <= 0);
    if (invalid) {
      this.errorMessage.set('Cannot update records without a tax arrears key. Use Add New Record instead.');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const request: TaxArrearsCaptureBulkUpdateRequest = {
      taxArrears: changedRows.map((row) => ({
        taxArrearKey: row.taxArrearKey,
        taxMemoDate: row.taxMemoDate.trim() || null,
        taxArrears: row.taxArrears,
        taxYear: row.taxYear.trim() || null,
        notes: row.notes.trim() || null,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('');
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
      return '-';
    }
    const iso = this.toDateInputValue(value);
    if (!iso) {
      return value;
    }
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }

  formatCurrency(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }

  private emptyNewRecord(): NewRecordForm {
    const currentYear = String(new Date().getFullYear());
    return {
      loanAliasId: null,
      loanKey: null,
      taxMemoDate: '',
      taxYear: currentYear,
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
        this.selectedStatuses.set(this.resolveDefaultStatusValues(this.statusOptions()));
        this.allLoans.set(Array.isArray(loans) ? loans : []);
        this.taxYearOptions.set(this.buildTaxYearOptions(lookups));
        this.isLoadingFilters.set(false);

        if (!this.aliasOptions().length) {
          this.errorMessage.set(
            'Unable to load loan alias list. Verify GET /api/LoanAlias and CORS.',
          );
        } else {
          this.loadGrid();
        }
      },
      error: () => {
        this.isLoadingFilters.set(false);
        this.errorMessage.set('Unable to load filters.');
      },
    });
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

  private resolveLoanAliasIds(): number[] {
    const selected = this.selectedLoanAliasIds();
    if (selected.length > 0) {
      return selected;
    }
    return this.aliasOptions().map((a) => a.loanAliasId).filter((id) => id > 0);
  }

  private loadGrid(): void {
    const loanAliasIds = this.resolveLoanAliasIds();
    const statuses = this.selectedStatuses();

    if (!loanAliasIds.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('No loan aliases available to load.');
      return;
    }

    if (!statuses.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('Select at least one status to load records.');
      return;
    }

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.taxArrearsApi.getRecords(loanAliasIds, statuses).subscribe({
      next: (response) => {
        const records = this.normalizeRecords(response);
        const mapped = records.map((r) => this.mapRow(r));
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

  private mergeTaxYearsFromRows(rows: TaxArrearRow[]): void {
    const years = new Set(this.taxYearOptions());
    for (const row of rows) {
      if (row.taxYear.trim()) {
        years.add(row.taxYear.trim());
      }
    }
    this.taxYearOptions.set([...years].sort((a, b) => Number(b) - Number(a)));
  }

  private normalizeRecords(response: unknown): TaxArrearsCaptureRowDto[] {
    if (Array.isArray(response)) {
      return response as TaxArrearsCaptureRowDto[];
    }
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      for (const key of ['taxArrears', 'records', 'data', 'results', 'items', 'value']) {
        const candidate = obj[key];
        if (Array.isArray(candidate)) {
          return candidate as TaxArrearsCaptureRowDto[];
        }
      }
    }
    return [];
  }

  private mapRow(record: TaxArrearsCaptureRowDto): TaxArrearRow {
    const raw = record as TaxArrearsCaptureRowDto & Record<string, unknown>;
    return {
      taxArrearKey: this.pickNumber(raw, 'taxArrearKey', 'TaxArrearKey'),
      loanKey: this.pickNumber(raw, 'loanKey', 'LoanKey'),
      loanId: this.pickString(raw, 'loanId', 'LoanId') || '-',
      description: this.pickString(raw, 'description', 'Description') || '-',
      loanAliasName: this.pickString(raw, 'loanAliasName', 'LoanAliasName') || '-',
      taxMemoDate: this.toDateInputValue(
        this.pickString(raw, 'taxMemoDate', 'TaxMemoDate') || null,
      ),
      taxArrears: this.pickNullableNumber(raw, 'taxArrears', 'TaxArrears'),
      taxYear: this.pickString(raw, 'taxYear', 'TaxYear'),
      notes: this.pickString(raw, 'notes', 'Notes'),
      userUpdatedBy: this.pickString(raw, 'userUpdatedBy', 'UserUpdatedBy') || '-',
      userUpdatedDate: this.pickString(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
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

  private parseNumericInput(value: string): number | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
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

  private resolveDefaultStatusValues(options: LoanStatusFilterOption[]): string[] {
    if (!options.length) {
      return [];
    }
    const preferred = options.find(
      (o) =>
        o.displayLabel.toLowerCase() === DEFAULT_STATUS_LABEL.toLowerCase() ||
        o.displayLabel.toLowerCase() === 'in default',
    );
    return [preferred?.value ?? options.find((o) => o.value !== '(null)')?.value ?? options[0].value];
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
