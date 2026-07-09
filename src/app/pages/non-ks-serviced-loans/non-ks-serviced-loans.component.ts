import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { InvestorAlias, InvestorApiService } from '../../core/services/investor-api.service';
import { LoanAliasOptionDto, LoansApiService } from '../../core/services/loans-api.service';
import {
  NonKsServicedLoanDto,
  NonKsServicedLoanPayload,
  NonKsServicedLoansApiService,
} from '../../core/services/non-ks-serviced-loans-api.service';

type LoanSelectOption = {
  label: string;
  value: string;
};

type NonKsLoanRow = {
  stableRowKey: string;
  nonKsServicedLoanKey: string;
  clientRowId: number;
  loanName: string;
  asAtDate: string;
  loanCode: string;
  servicerId: string;
  description: string;
  investor: string;
  dateOfDefault: string;
  maturityDate: string;
  interestOffDate: string;
  taxMemoDate: string;
  securityValue: number | null;
  units: number | null;
  netAcres: number | null;
  squareFeet: number | null;
  interestRate: number | null;
  principalBalance: number | null;
  outstandingInterest: number | null;
  accruedInterest: number | null;
  lateInterest: number | null;
  outstandingInvoices: number | null;
  estRealizationCosts: number | null;
  costToComplete: number | null;
  taxArrears: number | null;
  interestAdjustment: number | null;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = Omit<
  NonKsLoanRow,
  'stableRowKey' | 'nonKsServicedLoanKey' | 'clientRowId' | 'userUpdatedBy' | 'userUpdatedDate'
>;

type DialogMode = 'create' | 'update' | 'duplicate';

type DialogDraft = RowSnapshot & {
  stableRowKey: string;
  nonKsServicedLoanKey: string;
  clientRowId: number;
  originalAsAtDate: string;
  /** Source Loan Code for update/duplicate; field stays read-only. */
  lockedLoanCode: string | null;
};

const NUMERIC_FIELDS: (keyof RowSnapshot)[] = [
  'securityValue',
  'units',
  'netAcres',
  'squareFeet',
  'interestRate',
  'principalBalance',
  'outstandingInterest',
  'accruedInterest',
  'lateInterest',
  'outstandingInvoices',
  'estRealizationCosts',
  'costToComplete',
  'taxArrears',
  'interestAdjustment',
];

/** Interest and costs currency fields may be negative. */
const NEGATIVE_ALLOWED_CURRENCY_FIELDS = new Set<keyof RowSnapshot>([
  'outstandingInterest',
  'accruedInterest',
  'interestAdjustment',
  'lateInterest',
  'outstandingInvoices',
  'estRealizationCosts',
  'costToComplete',
  'taxArrears',
]);

const DIALOG_INTEGER_FIELDS = new Set<keyof RowSnapshot>(['units', 'squareFeet']);

const DIALOG_DECIMAL_FIELDS: Partial<Record<keyof RowSnapshot, number>> = {
  netAcres: 2,
};

const DIALOG_CURRENCY_FIELDS = new Set<keyof RowSnapshot>([
  'securityValue',
  'principalBalance',
  'outstandingInterest',
  'accruedInterest',
  'interestAdjustment',
  'lateInterest',
  'outstandingInvoices',
  'estRealizationCosts',
  'costToComplete',
  'taxArrears',
]);

type NonKsColumnKey =
  | keyof RowSnapshot
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type NonKsTableColumn = {
  key: NonKsColumnKey;
  label: string;
  numeric?: boolean;
  audit?: boolean;
};

const NON_KS_TABLE_COLUMNS: NonKsTableColumn[] = [
  { key: 'loanName', label: 'Loan Alias' },
  { key: 'asAtDate', label: 'As At' },
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'servicerId', label: 'Servicer ID' },
  { key: 'description', label: 'Loan Name' },
  { key: 'investor', label: 'Investor Alias' },
  { key: 'dateOfDefault', label: 'Default Date' },
  { key: 'maturityDate', label: 'Maturity' },
  { key: 'interestOffDate', label: 'Interest Off' },
  { key: 'taxMemoDate', label: 'Tax Memo' },
  { key: 'securityValue', label: 'Security Value', numeric: true },
  { key: 'units', label: 'Units', numeric: true },
  { key: 'netAcres', label: 'Net Acres', numeric: true },
  { key: 'squareFeet', label: 'SF', numeric: true },
  { key: 'interestRate', label: 'Interest Rate', numeric: true },
  { key: 'principalBalance', label: 'Principal', numeric: true },
  { key: 'outstandingInterest', label: 'Outstanding Int.', numeric: true },
  { key: 'accruedInterest', label: 'Accrued Int.', numeric: true },
  { key: 'lateInterest', label: 'Late Int.', numeric: true },
  { key: 'interestAdjustment', label: 'Int. Adj.', numeric: true },
  { key: 'outstandingInvoices', label: 'Outstanding Inv.', numeric: true },
  { key: 'estRealizationCosts', label: 'Est. Realization', numeric: true },
  { key: 'costToComplete', label: 'Cost to Complete', numeric: true },
  { key: 'taxArrears', label: 'Tax Arrears', numeric: true },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-non-ks-serviced-loans',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './non-ks-serviced-loans.component.html',
  styleUrl: './non-ks-serviced-loans.component.css',
})
export class NonKsServicedLoansComponent implements OnInit {
  private readonly api = inject(NonKsServicedLoansApiService);
  private readonly loansApi = inject(LoansApiService);
  private readonly investorApi = inject(InvestorApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = NON_KS_TABLE_COLUMNS;
  readonly rows = signal<NonKsLoanRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});
  readonly loanAliasOptions = signal<LoanAliasOptionDto[]>([]);
  readonly investorAliasOptions = signal<InvestorAlias[]>([]);
  readonly selectedLoanKeys = signal<string[]>([]);

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);
  readonly sortColumn = signal<NonKsColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  private pendingExtLoanCode = signal('NONKS-1');

  readonly showEntryDialog = signal(false);
  readonly dialogMode = signal<DialogMode>('create');
  readonly selectedRowTrackId = signal<string | null>(null);
  readonly dialogDraft = signal<DialogDraft | null>(null);
  /** Raw in-progress text for dialog numeric inputs (avoids reformat-on-keystroke). */
  readonly dialogFieldText = signal<Record<string, string>>({});
  readonly dialogError = signal('');

  readonly hasSelectedRow = computed(() => this.selectedRowTrackId() !== null);

  readonly dialogTitle = computed(() => {
    switch (this.dialogMode()) {
      case 'create':
        return 'Add New Non-KS Loan';
      case 'update':
        return 'Update Non-KS Loan';
      case 'duplicate':
        return 'Duplicate Non-KS Loan';
      default:
        return 'Non-KS Loan';
    }
  });

  ngOnInit(): void {
    this.loadGrid();
  }

  readonly loanSelectOptions = computed<LoanSelectOption[]>(() => {
    const options = new Map<string, string>();

    for (const alias of this.loanAliasOptions()) {
      const name = alias.loanAliasName.trim();
      if (name) {
        options.set(name.toLowerCase(), name);
      }
    }

    for (const row of this.rows()) {
      const alias = row.loanName.trim();
      if (alias) {
        options.set(alias.toLowerCase(), alias);
      }
      const loanCode = row.loanCode.trim();
      if (loanCode) {
        const label = alias ? `${loanCode} — ${alias}` : loanCode;
        options.set(`id:${loanCode.toLowerCase()}`, label);
      }
    }

    return [...options.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  readonly filteredRows = computed(() => {
    let rows = this.rows();

    const selected = this.selectedLoanKeys();
    if (selected.length) {
      const selectedSet = new Set(selected.map((key) => key.toLowerCase()));
      rows = rows.filter((row) => {
        const aliasKey = row.loanName.trim().toLowerCase();
        const loanCodeKey = row.loanCode.trim() ? `id:${row.loanCode.trim().toLowerCase()}` : '';
        return (
          (aliasKey && selectedSet.has(aliasKey)) ||
          (loanCodeKey && selectedSet.has(loanCodeKey))
        );
      });
    }

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

  updateSelectedLoans(values: string[] | null): void {
    this.selectedLoanKeys.set(values ?? []);
    this.currentPage.set(1);
    this.clearMessages();
  }

  clearSelection(): void {
    this.selectedLoanKeys.set([]);
    this.currentPage.set(1);
    this.clearMessages();
  }

  rowTrackId(row: NonKsLoanRow): string {
    if (row.stableRowKey) {
      return `key-${row.stableRowKey}`;
    }
    return `new-${row.clientRowId}`;
  }

  isNewRow(row: NonKsLoanRow): boolean {
    return !row.stableRowKey;
  }

  toggleRowSelection(row: NonKsLoanRow): void {
    const trackId = this.rowTrackId(row);
    this.selectedRowTrackId.set(this.selectedRowTrackId() === trackId ? null : trackId);
    this.clearMessages();
  }

  isRowSelected(row: NonKsLoanRow): boolean {
    return this.selectedRowTrackId() === this.rowTrackId(row);
  }

  openAddDialog(): void {
    const loanCode = this.pendingExtLoanCode();
    this.dialogMode.set('create');
    this.dialogFieldText.set({});
    this.dialogDraft.set(this.emptyDialogDraft(loanCode));
    this.dialogError.set('');
    this.showEntryDialog.set(true);
  }

  openUpdateDialog(): void {
    const row = this.findSelectedRow();
    if (!row) {
      return;
    }
    this.dialogMode.set('update');
    this.dialogFieldText.set({});
    this.dialogDraft.set(this.rowToDialogDraft(row));
    this.dialogError.set('');
    this.showEntryDialog.set(true);
  }

  openDuplicateDialog(): void {
    const row = this.findSelectedRow();
    if (!row) {
      return;
    }
    this.dialogMode.set('duplicate');
    this.dialogFieldText.set({});
    this.dialogDraft.set(this.rowToDuplicateDialogDraft(row));
    this.dialogError.set('');
    this.showEntryDialog.set(true);
  }

  closeEntryDialog(): void {
    this.showEntryDialog.set(false);
    this.dialogDraft.set(null);
    this.dialogFieldText.set({});
    this.dialogError.set('');
  }

  saveEntryDialog(): void {
    if (this.isSaving()) {
      return;
    }

    this.commitAllDialogNumericFields();

    const draft = this.dialogDraft();
    if (!draft) {
      return;
    }

    const validationError = this.validateDialogDraft(draft);
    if (validationError) {
      this.dialogError.set(validationError);
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.dialogError.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const mode = this.dialogMode();
    this.isSaving.set(true);
    this.dialogError.set('');
    this.errorMessage.set('');
    this.statusMessage.set('');

    const savedPage = this.currentPage();

    if (mode === 'update') {
      this.saveUpdatedDraft(draft, userUpdatedBy, savedPage);
      return;
    }

    this.saveCreatedDraft(draft, userUpdatedBy, savedPage, mode);
  }

  dialogInputDisplay(field: string, formatted: string): string {
    const raw = this.dialogFieldText()[field];
    return raw !== undefined ? raw : formatted;
  }

  onDialogInputText(field: string, value: string): void {
    this.dialogFieldText.update((current) => ({ ...current, [field]: value }));
    this.dialogError.set('');
  }

  commitDialogIntegerField(field: keyof RowSnapshot, input: HTMLInputElement): void {
    const parsed = this.parseIntegerInput(input.value);
    this.patchDialogDraft({ [field]: parsed } as Partial<DialogDraft>);
    this.clearDialogFieldText(field);
    input.value = this.formatIntegerInput(parsed);
  }

  commitDialogDecimalField(
    field: keyof RowSnapshot,
    input: HTMLInputElement,
    fractionDigits: number,
  ): void {
    const parsed = this.parseDecimalInput(input.value, fractionDigits);
    this.patchDialogDraft({ [field]: parsed } as Partial<DialogDraft>);
    this.clearDialogFieldText(field);
    input.value = this.formatDecimalInput(parsed, fractionDigits);
  }

  commitDialogCurrencyField(field: keyof RowSnapshot, input: HTMLInputElement): void {
    const allowNegative = NEGATIVE_ALLOWED_CURRENCY_FIELDS.has(field);
    const parsed = this.parseCurrencyInput(input.value, allowNegative);
    this.patchDialogDraft({ [field]: parsed } as Partial<DialogDraft>);
    this.clearDialogFieldText(field);
    input.value = this.formatCurrencyInput(parsed);
  }

  commitDialogPercentField(input: HTMLInputElement): void {
    const parsed = this.parsePercentInput(input.value);
    this.patchDialogDraft({ interestRate: parsed });
    this.clearDialogFieldText('interestRate');
    input.value = this.formatPercentInput(parsed);
  }

  private clearDialogFieldText(field: string): void {
    this.dialogFieldText.update((current) => {
      if (!(field in current)) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  private commitAllDialogNumericFields(): void {
    const pending = this.dialogFieldText();
    const keys = Object.keys(pending);
    if (!keys.length) {
      return;
    }

    const patch: Partial<DialogDraft> = {};
    for (const fieldName of keys) {
      const field = fieldName as keyof RowSnapshot;
      const raw = pending[fieldName] ?? '';
      if (field === 'interestRate') {
        patch.interestRate = this.parsePercentInput(raw);
        continue;
      }
      if (DIALOG_INTEGER_FIELDS.has(field)) {
        patch[field] = this.parseIntegerInput(raw) as never;
        continue;
      }
      if (field in DIALOG_DECIMAL_FIELDS) {
        const digits = DIALOG_DECIMAL_FIELDS[field] ?? 2;
        patch[field] = this.parseDecimalInput(raw, digits) as never;
        continue;
      }
      if (DIALOG_CURRENCY_FIELDS.has(field)) {
        patch[field] = this.parseCurrencyInput(
          raw,
          NEGATIVE_ALLOWED_CURRENCY_FIELDS.has(field),
        ) as never;
      }
    }

    if (Object.keys(patch).length) {
      this.patchDialogDraft(patch);
    }
    this.dialogFieldText.set({});
  }

  updateDialogTextField(field: keyof RowSnapshot, value: string): void {
    this.patchDialogDraft({ [field]: value } as Partial<DialogDraft>);
  }

  updateDialogDateField(field: keyof RowSnapshot, value: string): void {
    this.patchDialogDraft({ [field]: value.trim() } as Partial<DialogDraft>);
  }

  formatCurrencyDisplay(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercentDisplay(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    return `${value.toFixed(2)}%`;
  }

  formatIntegerDisplay(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.trunc(value));
  }

  formatDecimalDisplay(value: number | null, fractionDigits: number): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  formatDateDisplay(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const parsed = new Date(`${value.trim()}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  formatTextDisplay(value: string): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
  }

  toggleSort(column: NonKsColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: NonKsColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  formatCurrencyInput(value: number | null): string {
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

  formatPercentInput(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return `${value.toFixed(2)}%`;
  }

  formatIntegerInput(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Math.trunc(value));
  }

  formatDecimalInput(value: number | null, fractionDigits: number): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
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

  private loadGrid(preservePage?: number, justSaved: NonKsServicedLoanDto[] = []): void {
    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    forkJoin({
      records: this.api.getAll().pipe(catchError((error) => {
        throw error;
      })),
      lookups: this.api.getLookups().pipe(catchError(() => of({ nextExtLoanCode: 'NONKS-1' }))),
      loanAliases: this.loansApi.getLookups().pipe(
        catchError(() => of({ loanAliases: [] as LoanAliasOptionDto[] })),
      ),
      investorAliases: this.investorApi.getAllAliases().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ records, lookups, loanAliases, investorAliases }) => {
        const normalized = this.mergeSavedRecords(this.normalizeRecords(records), justSaved);
        const mapped = normalized.map((r) => this.mapRow(r));
        this.rows.set(mapped);
        if (preservePage != null) {
          this.currentPage.set(Math.min(preservePage, Math.max(1, Math.ceil(mapped.length / this.pageSize()) || 1)));
        } else {
          this.currentPage.set(1);
        }
        this.snapshotOriginalState();

        this.loanAliasOptions.set(
          (loanAliases.loanAliases ?? [])
            .map((alias) => ({
              loanAliasId: Number(alias.loanAliasId ?? 0),
              loanAliasName: String(alias.loanAliasName ?? '').trim(),
            }))
            .filter((alias) => alias.loanAliasName)
            .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName)),
        );

        this.investorAliasOptions.set(
          investorAliases
            .map((alias) => ({
              investorAliasId: Number(alias.investorAliasId ?? 0),
              investorAliasName: String(alias.investorAliasName ?? '').trim(),
              createdBy: alias.createdBy ?? '',
              createdDtm: alias.createdDtm ?? null,
              updatedBy: alias.updatedBy ?? '',
              updatedDtm: alias.updatedDtm ?? null,
            }))
            .filter((alias) => alias.investorAliasName)
            .sort((a, b) => a.investorAliasName.localeCompare(b.investorAliasName)),
        );

        const apiNext =
          this.pickString(lookups as Record<string, unknown>, 'nextExtLoanCode', 'NextExtLoanCode') ||
          'NONKS-1';
        this.syncPendingExtLoanCode(apiNext);

        this.statusMessage.set(
          mapped.length > 0
            ? `${mapped.length} record(s) loaded.`
            : 'No records yet. Use Add New Row to enter quarterly data.',
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

  private emptyRow(clientRowId: number): NonKsLoanRow {
    return {
      stableRowKey: '',
      nonKsServicedLoanKey: '',
      clientRowId,
      loanName: '',
      asAtDate: '',
      loanCode: '',
      servicerId: '',
      description: '',
      investor: '',
      dateOfDefault: '',
      maturityDate: '',
      interestOffDate: '',
      taxMemoDate: '',
      securityValue: null,
      units: null,
      netAcres: null,
      squareFeet: null,
      interestRate: null,
      principalBalance: null,
      outstandingInterest: null,
      accruedInterest: null,
      lateInterest: null,
      outstandingInvoices: null,
      estRealizationCosts: null,
      costToComplete: null,
      taxArrears: null,
      interestAdjustment: null,
      userUpdatedBy: '-',
      userUpdatedDate: '',
    };
  }

  private findSelectedRow(): NonKsLoanRow | null {
    const trackId = this.selectedRowTrackId();
    if (!trackId) {
      return null;
    }
    return this.rows().find((row) => this.rowTrackId(row) === trackId) ?? null;
  }

  private emptyDialogDraft(loanCode: string): DialogDraft {
    return {
      ...this.emptyRowSnapshot(),
      loanCode,
      stableRowKey: '',
      nonKsServicedLoanKey: '',
      clientRowId: 0,
      originalAsAtDate: '',
      lockedLoanCode: null,
    };
  }

  private emptyRowSnapshot(): RowSnapshot {
    const row = this.emptyRow(0);
    return this.rowSnapshot(row);
  }

  private rowToDialogDraft(row: NonKsLoanRow): DialogDraft {
    const original = this.originalRowState()[this.rowTrackId(row)];
    const loanCode = row.loanCode.trim();
    return {
      ...this.rowSnapshot(row),
      loanCode,
      stableRowKey: row.stableRowKey,
      nonKsServicedLoanKey: row.nonKsServicedLoanKey,
      clientRowId: row.clientRowId,
      originalAsAtDate: original?.asAtDate ?? row.asAtDate,
      lockedLoanCode: loanCode || null,
    };
  }

  private rowToDuplicateDialogDraft(row: NonKsLoanRow): DialogDraft {
    const loanCode = row.loanCode.trim();
    return {
      ...this.rowSnapshot(row),
      loanCode,
      stableRowKey: '',
      nonKsServicedLoanKey: '',
      clientRowId: 0,
      originalAsAtDate: '',
      lockedLoanCode: loanCode || null,
    };
  }

  private dialogDraftToRow(draft: DialogDraft): NonKsLoanRow {
    const loanCode = draft.lockedLoanCode ?? draft.loanCode;
    return {
      stableRowKey: draft.stableRowKey,
      nonKsServicedLoanKey: draft.nonKsServicedLoanKey,
      clientRowId: draft.clientRowId,
      loanName: draft.loanName,
      asAtDate: draft.asAtDate,
      loanCode,
      servicerId: draft.servicerId,
      description: draft.description,
      investor: draft.investor,
      dateOfDefault: draft.dateOfDefault,
      maturityDate: draft.maturityDate,
      interestOffDate: draft.interestOffDate,
      taxMemoDate: draft.taxMemoDate,
      securityValue: draft.securityValue,
      units: draft.units,
      netAcres: draft.netAcres,
      squareFeet: draft.squareFeet,
      interestRate: draft.interestRate,
      principalBalance: draft.principalBalance,
      outstandingInterest: draft.outstandingInterest,
      accruedInterest: draft.accruedInterest,
      lateInterest: draft.lateInterest,
      outstandingInvoices: draft.outstandingInvoices,
      estRealizationCosts: draft.estRealizationCosts,
      costToComplete: draft.costToComplete,
      taxArrears: draft.taxArrears,
      interestAdjustment: draft.interestAdjustment,
      userUpdatedBy: '-',
      userUpdatedDate: '',
    };
  }

  private patchDialogDraft(patch: Partial<DialogDraft>): void {
    const draft = this.dialogDraft();
    if (!draft) {
      return;
    }
    if (draft.lockedLoanCode !== null && 'loanCode' in patch) {
      const { loanCode: _ignored, ...safePatch } = patch;
      this.dialogDraft.set({ ...draft, ...safePatch, loanCode: draft.lockedLoanCode });
      this.dialogError.set('');
      return;
    }
    this.dialogDraft.set({ ...draft, ...patch });
    this.dialogError.set('');
  }

  private validateDialogDraft(draft: DialogDraft): string | null {
    if (!this.hasAnyInputInDraft(draft)) {
      return 'Enter at least one field before saving.';
    }
    return null;
  }

  private hasAnyInputInDraft(draft: DialogDraft): boolean {
    const snap: RowSnapshot = { ...draft };
    return Object.entries(snap).some(([key, value]) => {
      if (NUMERIC_FIELDS.includes(key as keyof RowSnapshot)) {
        return value != null;
      }
      if (key === 'loanCode') {
        return typeof value === 'string' && value.trim().length > 0;
      }
      return typeof value === 'string' && value.trim().length > 0;
    });
  }

  private saveCreatedDraft(
    draft: DialogDraft,
    userUpdatedBy: string,
    savedPage: number,
    mode: DialogMode,
  ): void {
    const reuseLoanCode = mode === 'duplicate';
    const expectedLoanCode = (draft.lockedLoanCode ?? draft.loanCode).trim();
    this.api
      .createLoans({
        loans: [this.toCreatePayload(draft, userUpdatedBy, reuseLoanCode)],
      })
      .pipe(catchError((error) => {
        throw error;
      }))
      .subscribe({
        next: (created) => {
          if (mode === 'create') {
            const loanCode = draft.loanCode.trim();
            if (loanCode) {
              this.pendingExtLoanCode.set(
                `NONKS-${this.parseExtLoanCodeNumber(loanCode) + 1}`,
              );
            }
          }
          let saved = Array.isArray(created) ? created : [];
          if (reuseLoanCode && expectedLoanCode) {
            saved = this.applyLoanCodeToSavedRecords(saved, expectedLoanCode);
          }
          this.selectedRowTrackId.set(null);
          this.closeEntryDialog();
          this.isSaving.set(false);
          this.statusMessage.set(
            reuseLoanCode ? 'Loan record duplicated successfully.' : 'Loan record created successfully.',
          );
          this.loadGrid(savedPage, saved);
        },
        error: (error) => {
          this.dialogError.set(this.extractBackendError(error));
          this.isSaving.set(false);
        },
      });
  }

  private saveUpdatedDraft(draft: DialogDraft, userUpdatedBy: string, savedPage: number): void {
    const row = this.dialogDraftToRow(draft);

    if (this.isNewRow(row)) {
      const trackId = this.rowTrackId(row);
      this.rows.set(
        this.rows().map((existing) =>
          this.rowTrackId(existing) === trackId ? row : existing,
        ),
      );
      this.selectedRowTrackId.set(null);
      this.closeEntryDialog();
      this.isSaving.set(false);
      this.statusMessage.set('Unsaved row updated locally.');
      return;
    }

    this.api
      .updateLoans({
        loans: [
          {
            ...this.toUpdatePayload(draft, userUpdatedBy),
            nonKsServicedLoanKey: draft.stableRowKey || null,
            originalAsAtDate: this.nullIfEmpty(draft.originalAsAtDate),
          },
        ],
      })
      .pipe(catchError((error) => {
        throw error;
      }))
      .subscribe({
        next: (updated) => {
          this.selectedRowTrackId.set(null);
          this.closeEntryDialog();
          this.isSaving.set(false);
          this.statusMessage.set('Loan record updated successfully.');
          this.loadGrid(savedPage, Array.isArray(updated) ? updated : []);
        },
        error: (error) => {
          this.dialogError.set(this.extractBackendError(error));
          this.isSaving.set(false);
        },
      });
  }

  private toCreatePayload(
    draft: DialogDraft,
    userUpdatedBy: string,
    reuseLoanCode: boolean,
  ): NonKsServicedLoanPayload {
    const loanAlias = this.nullIfEmpty(draft.loanName);
    const investorAlias = this.nullIfEmpty(draft.investor);
    const loanCode = this.nullIfEmpty(draft.lockedLoanCode ?? draft.loanCode);
    return {
      loanAliasName: loanAlias,
      loanName: loanAlias,
      asAtDate: this.nullIfEmpty(draft.asAtDate),
      loanCode: reuseLoanCode ? loanCode : null,
      loanId: reuseLoanCode ? loanCode : null,
      extLoanCode: reuseLoanCode ? loanCode : null,
      servicerId: this.nullIfEmpty(draft.servicerId),
      description: this.nullIfEmpty(draft.description),
      investorAliasName: investorAlias,
      investor: investorAlias,
      dateOfDefault: this.nullIfEmpty(draft.dateOfDefault),
      maturityDate: this.nullIfEmpty(draft.maturityDate),
      interestOffDate: this.nullIfEmpty(draft.interestOffDate),
      taxMemoDate: this.nullIfEmpty(draft.taxMemoDate),
      securityValue: draft.securityValue,
      units: draft.units,
      netAcres: draft.netAcres,
      squareFeet: draft.squareFeet,
      interestRate: draft.interestRate,
      principalBalance: draft.principalBalance,
      outstandingInterest: draft.outstandingInterest,
      accruedInterest: draft.accruedInterest,
      lateInterest: draft.lateInterest,
      outstandingInvoices: draft.outstandingInvoices,
      estRealizationCosts: draft.estRealizationCosts,
      costToComplete: draft.costToComplete,
      taxArrears: draft.taxArrears,
      interestAdjustment: draft.interestAdjustment,
      userUpdatedBy,
    };
  }

  private toUpdatePayload(draft: DialogDraft, userUpdatedBy: string): NonKsServicedLoanPayload {
    return this.toCreatePayload(draft, userUpdatedBy, true);
  }

  private applyLoanCodeToSavedRecords(
    records: NonKsServicedLoanDto[],
    loanCode: string,
  ): NonKsServicedLoanDto[] {
    return records.map((record) => ({
      ...record,
      loanCode,
      loanId: loanCode,
      extLoanCode: loanCode,
    }));
  }

  private mapRow(record: NonKsServicedLoanDto): NonKsLoanRow {
    const raw = record as NonKsServicedLoanDto & Record<string, unknown>;
    const stableRowKey = this.pickRowKey(raw);
    return {
      stableRowKey,
      nonKsServicedLoanKey: stableRowKey,
      clientRowId: 0,
      loanName: this.pickString(
        raw,
        'loanAliasName',
        'LoanAliasName',
        'loanName',
        'LoanName',
      ),
      asAtDate: this.toDateInputValue(
        this.pickString(raw, 'asAtDate', 'AsAtDate', 'asOfDate', 'AsOfDate') || null,
      ),
      loanCode: this.pickString(
        raw,
        'loanCode',
        'LoanCode',
        'extLoanCode',
        'ExtLoanCode',
        'loanId',
        'LoanId',
      ),
      servicerId: this.pickString(
        raw,
        'servicerId',
        'ServicerId',
        'syndicateLoanCode',
        'SyndicateLoanCode',
      ),
      description: this.pickString(raw, 'description', 'Description', 'loanDescription', 'LoanDescription'),
      investor: this.pickString(
        raw,
        'investorAliasName',
        'InvestorAliasName',
        'investor',
        'Investor',
      ),
      dateOfDefault: this.toDateInputValue(
        this.pickString(raw, 'dateOfDefault', 'DateOfDefault') || null,
      ),
      maturityDate: this.toDateInputValue(
        this.pickString(raw, 'maturityDate', 'MaturityDate') || null,
      ),
      interestOffDate: this.toDateInputValue(
        this.pickString(raw, 'interestOffDate', 'InterestOffDate') || null,
      ),
      taxMemoDate: this.toDateInputValue(this.pickString(raw, 'taxMemoDate', 'TaxMemoDate') || null),
      securityValue: this.pickNullableNumber(raw, 'securityValue', 'SecurityValue'),
      units: this.pickNullableNumber(raw, 'units', 'Units'),
      netAcres: this.pickNullableNumber(raw, 'netAcres', 'NetAcres'),
      squareFeet: this.pickNullableNumber(raw, 'squareFeet', 'SquareFeet', 'sf', 'SF'),
      interestRate: this.pickNullableNumber(raw, 'interestRate', 'InterestRate'),
      principalBalance: this.pickNullableNumber(
        raw,
        'principalBalance',
        'PrincipalBalance',
        'principal',
        'Principal',
      ),
      outstandingInterest: this.pickNullableNumber(
        raw,
        'outstandingInterest',
        'OutstandingInterest',
      ),
      accruedInterest: this.pickNullableNumber(raw, 'accruedInterest', 'AccruedInterest'),
      lateInterest: this.pickNullableNumber(raw, 'lateInterest', 'LateInterest'),
      outstandingInvoices: this.pickNullableNumber(
        raw,
        'outstandingInvoices',
        'OutstandingInvoices',
        'outstandingInvoice',
        'OutstandingInvoice',
        'outstandingInvested',
        'OutstandingInvested',
      ),
      estRealizationCosts: this.pickNullableNumber(
        raw,
        'estRealizationCosts',
        'EstRealizationCosts',
        'estimatedRealizationCosts',
        'EstimatedRealizationCosts',
        'estRealizationCost',
        'EstRealizationCost',
      ),
      costToComplete: this.pickNullableNumber(raw, 'costToComplete', 'CostToComplete'),
      taxArrears: this.pickNullableNumber(
        raw,
        'taxArrears',
        'TaxArrears',
        'arrearsAsOf',
        'ArrearsAsOf',
      ),
      interestAdjustment: this.pickNullableNumber(raw, 'interestAdjustment', 'InterestAdjustment'),
      userUpdatedBy:
        this.pickString(
          raw,
          'userUpdatedBy',
          'UserUpdatedBy',
          'modifiedBy',
          'ModifiedBy',
          'updatedBy',
          'UpdatedBy',
        ) || '-',
      userUpdatedDate: this.pickString(
        raw,
        'userUpdatedDate',
        'UserUpdatedDate',
        'updatedDatetime',
        'UpdatedDatetime',
        'modifiedDate',
        'ModifiedDate',
      ),
    };
  }

  private rowSnapshot(row: NonKsLoanRow): RowSnapshot {
    const {
      loanName,
      asAtDate,
      loanCode,
      servicerId,
      description,
      investor,
      dateOfDefault,
      maturityDate,
      interestOffDate,
      taxMemoDate,
      securityValue,
      units,
      netAcres,
      squareFeet,
      interestRate,
      principalBalance,
      outstandingInterest,
      accruedInterest,
      lateInterest,
      outstandingInvoices,
      estRealizationCosts,
      costToComplete,
      taxArrears,
      interestAdjustment,
    } = row;
    return {
      loanName,
      asAtDate,
      loanCode,
      servicerId,
      description,
      investor,
      dateOfDefault,
      maturityDate,
      interestOffDate,
      taxMemoDate,
      securityValue,
      units,
      netAcres,
      squareFeet,
      interestRate,
      principalBalance,
      outstandingInterest,
      accruedInterest,
      lateInterest,
      outstandingInvoices,
      estRealizationCosts,
      costToComplete,
      taxArrears,
      interestAdjustment,
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, RowSnapshot> = {};
    for (const row of this.rows()) {
      if (!this.isNewRow(row)) {
        snapshot[this.rowTrackId(row)] = this.rowSnapshot(row);
      }
    }
    this.originalRowState.set(snapshot);
  }

  private syncPendingExtLoanCode(apiNext = this.pendingExtLoanCode()): void {
    let nextNumber = this.parseExtLoanCodeNumber(apiNext) || 1;
    for (const row of this.rows()) {
      const rowNumber = this.parseExtLoanCodeNumber(row.loanCode);
      if (rowNumber >= nextNumber) {
        nextNumber = rowNumber + 1;
      }
    }
    this.pendingExtLoanCode.set(`NONKS-${nextNumber}`);
  }

  private parseExtLoanCodeNumber(code: string): number {
    const match = /^NONKS-(\d+)$/i.exec(code?.trim() ?? '');
    return match ? Number.parseInt(match[1], 10) : 0;
  }

  private compareLoanCodes(left: string, right: string): number {
    const leftNumber = this.parseExtLoanCodeNumber(left);
    const rightNumber = this.parseExtLoanCodeNumber(right);
    if (leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }

    return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
  }

  private normalizeRecords(response: unknown): NonKsServicedLoanDto[] {
    if (Array.isArray(response)) {
      return response as NonKsServicedLoanDto[];
    }
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      for (const key of ['loans', 'data', 'results', 'items', 'value']) {
        const candidate = obj[key];
        if (Array.isArray(candidate)) {
          return candidate as NonKsServicedLoanDto[];
        }
      }
    }
    return [];
  }

  private compareRows(left: NonKsLoanRow, right: NonKsLoanRow, column: NonKsColumnKey): number {
    switch (column) {
      case 'userUpdatedBy':
        return left.userUpdatedBy.localeCompare(right.userUpdatedBy, undefined, {
          sensitivity: 'base',
        });
      case 'userUpdatedDate':
        return this.dateSortValue(left.userUpdatedDate) - this.dateSortValue(right.userUpdatedDate);
      case 'asAtDate':
      case 'dateOfDefault':
      case 'maturityDate':
      case 'interestOffDate':
      case 'taxMemoDate':
        return this.dateSortValue(left[column]) - this.dateSortValue(right[column]);
      case 'securityValue':
      case 'units':
      case 'netAcres':
      case 'squareFeet':
      case 'interestRate':
      case 'principalBalance':
      case 'outstandingInterest':
      case 'accruedInterest':
      case 'lateInterest':
      case 'outstandingInvoices':
      case 'estRealizationCosts':
      case 'costToComplete':
      case 'taxArrears':
      case 'interestAdjustment':
        return (left[column] ?? 0) - (right[column] ?? 0);
      case 'loanCode':
        return this.compareLoanCodes(left.loanCode, right.loanCode);
      default:
        return left[column].localeCompare(right[column], undefined, { sensitivity: 'base' });
    }
  }

  private dateSortValue(value: string): number {
    if (!value?.trim()) {
      return 0;
    }
    const parsed = new Date(value.includes('T') ? value : `${value.trim()}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private nullIfEmpty(value: string): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  private parseCurrencyInput(value: string, allowNegative = false): number | null {
    const trimmed = value.replace(/[$,\s]/g, '').trim();
    if (!trimmed || trimmed === '-' || trimmed === '-.' || trimmed === '.') {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    if (!allowNegative && parsed < 0) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }

  private parseIntegerInput(value: string): number | null {
    const trimmed = value.replace(/[,\s]/g, '').trim();
    if (!trimmed || trimmed === '-') {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseDecimalInput(value: string, fractionDigits: number): number | null {
    const trimmed = value.replace(/[,\s]/g, '').trim();
    if (!trimmed || trimmed === '-' || trimmed === '-.' || trimmed === '.') {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Number(parsed.toFixed(fractionDigits));
  }

  private parsePercentInput(value: string): number | null {
    const trimmed = value.replace(/%/g, '').trim();
    if (!trimmed || trimmed === '-' || trimmed === '-.' || trimmed === '.') {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Number(parsed.toFixed(2));
  }

  private mergeSavedRecords(
    loaded: NonKsServicedLoanDto[],
    saved: NonKsServicedLoanDto[],
  ): NonKsServicedLoanDto[] {
    if (!saved.length) {
      return loaded;
    }

    const savedByKey = new Map(saved.map((row) => [this.recordKey(row), row]));
    const merged = loaded.map((row) => savedByKey.get(this.recordKey(row)) ?? row);

    for (const row of saved) {
      const key = this.recordKey(row);
      if (!merged.some((existing) => this.recordKey(existing) === key)) {
        merged.push(row);
      }
    }

    return merged;
  }

  private recordKey(record: NonKsServicedLoanDto): string {
    const raw = record as NonKsServicedLoanDto & Record<string, unknown>;
    const loanCode = this.pickString(
      raw,
      'loanCode',
      'LoanCode',
      'extLoanCode',
      'ExtLoanCode',
      'loanId',
      'LoanId',
    );
    const asAtDate = this.toDateInputValue(
      this.pickString(raw, 'asAtDate', 'AsAtDate', 'asOfDate', 'AsOfDate') || null,
    );
    return `${loanCode}|${asAtDate}`;
  }

  private pickRowKey(record: Record<string, unknown>): string {
    for (const key of ['nonKsServicedLoanKey', 'NonKsServicedLoanKey']) {
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
        const parsed = Number(value.trim().replace(/[,$%]/g, ''));
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
      if (typeof value === 'string') {
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

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to load or save non-KS serviced loan data.';
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
