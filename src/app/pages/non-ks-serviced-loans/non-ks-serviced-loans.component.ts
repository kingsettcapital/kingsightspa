import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  NonKsServicedLoanDto,
  NonKsServicedLoanPayload,
  NonKsServicedLoansApiService,
} from '../../core/services/non-ks-serviced-loans-api.service';

type NonKsLoanRow = {
  nonKsServicedLoanKey: number;
  clientRowId: number;
  loanName: string;
  asAtDate: string;
  loanId: string;
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
  interestAsOfTaxMemo: number | null;
  interestAdjustment: number | null;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = Omit<NonKsLoanRow, 'nonKsServicedLoanKey' | 'clientRowId' | 'userUpdatedBy' | 'userUpdatedDate'>;

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
  'interestAsOfTaxMemo',
  'interestAdjustment',
];

@Component({
  selector: 'app-non-ks-serviced-loans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './non-ks-serviced-loans.component.html',
  styleUrl: './non-ks-serviced-loans.component.css',
})
export class NonKsServicedLoansComponent implements OnInit {
  private readonly api = inject(NonKsServicedLoansApiService);
  private readonly defaultPageSize = 10;
  private readonly userUpdatedBy = 'system';
  private nextClientRowId = -1;

  readonly rows = signal<NonKsLoanRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  ngOnInit(): void {
    this.loadGrid();
  }

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

  rowTrackId(row: NonKsLoanRow): string {
    if (row.nonKsServicedLoanKey > 0) {
      return `key-${row.nonKsServicedLoanKey}`;
    }
    return `new-${row.clientRowId}`;
  }

  isNewRow(row: NonKsLoanRow): boolean {
    return row.nonKsServicedLoanKey <= 0;
  }

  addRow(): void {
    const row = this.emptyRow(this.nextClientRowId);
    this.nextClientRowId -= 1;
    this.rows.set([row, ...this.rows()]);
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeRow(row: NonKsLoanRow): void {
    const trackId = this.rowTrackId(row);
    this.rows.set(this.rows().filter((r) => this.rowTrackId(r) !== trackId));
    const snapshot = { ...this.originalRowState() };
    delete snapshot[trackId];
    this.originalRowState.set(snapshot);
    this.clearMessages();
  }

  updateTextField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: value } as Partial<NonKsLoanRow>);
  }

  updateDateField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: value.trim() } as Partial<NonKsLoanRow>);
  }

  updateNumericField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: this.parseNumericInput(value) } as Partial<NonKsLoanRow>);
  }

  formatNumber(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
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

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const newRows = this.rows().filter((row) => this.isNewRow(row) && this.hasAnyInput(row));
    const changedRows = this.rows().filter(
      (row) => !this.isNewRow(row) && this.hasRowChanged(row),
    );

    if (!newRows.length && !changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    const requests = [];
    if (newRows.length) {
      requests.push(
        this.api
          .createLoans({ loans: newRows.map((row) => this.toPayload(row)) })
          .pipe(catchError((error) => {
            throw error;
          })),
      );
    }
    if (changedRows.length) {
      requests.push(
        this.api
          .updateLoans({
            loans: changedRows.map((row) => ({
              ...this.toPayload(row),
              nonKsServicedLoanKey: row.nonKsServicedLoanKey,
            })),
          })
          .pipe(catchError((error) => {
            throw error;
          })),
      );
    }

    forkJoin(requests.length ? requests : [of(null)]).subscribe({
      next: () => {
        const parts = [];
        if (newRows.length) {
          parts.push(`${newRows.length} created`);
        }
        if (changedRows.length) {
          parts.push(`${changedRows.length} updated`);
        }
        this.statusMessage.set(`Save successful: ${parts.join(', ')}.`);
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

  private loadGrid(): void {
    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.api.getAll().subscribe({
      next: (response) => {
        const records = this.normalizeRecords(response);
        const mapped = records.map((r) => this.mapRow(r));
        this.rows.set(mapped);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mapped.length > 0
            ? `${mapped.length} record(s) loaded.`
            : 'No records yet. Use Add Row to enter quarterly data.',
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
      nonKsServicedLoanKey: 0,
      clientRowId,
      loanName: '',
      asAtDate: '',
      loanId: '',
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
      interestAsOfTaxMemo: null,
      interestAdjustment: null,
      userUpdatedBy: '-',
      userUpdatedDate: '',
    };
  }

  private patchRow(row: NonKsLoanRow, patch: Partial<NonKsLoanRow>): void {
    const trackId = this.rowTrackId(row);
    this.rows.set(
      this.rows().map((r) => (this.rowTrackId(r) === trackId ? { ...r, ...patch } : r)),
    );
    this.clearMessages();
  }

  private mapRow(record: NonKsServicedLoanDto): NonKsLoanRow {
    const raw = record as NonKsServicedLoanDto & Record<string, unknown>;
    return {
      nonKsServicedLoanKey: this.pickNumber(raw, 'nonKsServicedLoanKey', 'NonKsServicedLoanKey'),
      clientRowId: 0,
      loanName: this.pickString(raw, 'loanName', 'LoanName'),
      asAtDate: this.toDateInputValue(this.pickString(raw, 'asAtDate', 'AsAtDate') || null),
      loanId: this.pickString(raw, 'loanId', 'LoanId'),
      servicerId: this.pickString(raw, 'servicerId', 'ServicerId'),
      description: this.pickString(raw, 'description', 'Description'),
      investor: this.pickString(raw, 'investor', 'Investor'),
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
        'outstandingInvested',
        'OutstandingInvested',
      ),
      estRealizationCosts: this.pickNullableNumber(
        raw,
        'estRealizationCosts',
        'EstRealizationCosts',
        'estRealizationCost',
        'EstRealizationCost',
      ),
      costToComplete: this.pickNullableNumber(raw, 'costToComplete', 'CostToComplete'),
      taxArrears: this.pickNullableNumber(raw, 'taxArrears', 'TaxArrears'),
      interestAsOfTaxMemo: this.pickNullableNumber(
        raw,
        'interestAsOfTaxMemo',
        'InterestAsOfTaxMemo',
      ),
      interestAdjustment: this.pickNullableNumber(raw, 'interestAdjustment', 'InterestAdjustment'),
      userUpdatedBy: this.pickString(raw, 'userUpdatedBy', 'UserUpdatedBy', 'modifiedBy', 'ModifiedBy') || '-',
      userUpdatedDate: this.pickString(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
  }

  private toPayload(row: NonKsLoanRow): NonKsServicedLoanPayload {
    return {
      loanName: this.nullIfEmpty(row.loanName),
      asAtDate: this.nullIfEmpty(row.asAtDate),
      loanId: this.nullIfEmpty(row.loanId),
      servicerId: this.nullIfEmpty(row.servicerId),
      description: this.nullIfEmpty(row.description),
      investor: this.nullIfEmpty(row.investor),
      dateOfDefault: this.nullIfEmpty(row.dateOfDefault),
      maturityDate: this.nullIfEmpty(row.maturityDate),
      interestOffDate: this.nullIfEmpty(row.interestOffDate),
      taxMemoDate: this.nullIfEmpty(row.taxMemoDate),
      securityValue: row.securityValue,
      units: row.units,
      netAcres: row.netAcres,
      squareFeet: row.squareFeet,
      interestRate: row.interestRate,
      principalBalance: row.principalBalance,
      outstandingInterest: row.outstandingInterest,
      accruedInterest: row.accruedInterest,
      lateInterest: row.lateInterest,
      outstandingInvoices: row.outstandingInvoices,
      estRealizationCosts: row.estRealizationCosts,
      costToComplete: row.costToComplete,
      taxArrears: row.taxArrears,
      interestAsOfTaxMemo: row.interestAsOfTaxMemo,
      interestAdjustment: row.interestAdjustment,
      userUpdatedBy: this.userUpdatedBy,
    };
  }

  private rowSnapshot(row: NonKsLoanRow): RowSnapshot {
    const {
      loanName,
      asAtDate,
      loanId,
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
      interestAsOfTaxMemo,
      interestAdjustment,
    } = row;
    return {
      loanName,
      asAtDate,
      loanId,
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
      interestAsOfTaxMemo,
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

  private hasRowChanged(row: NonKsLoanRow): boolean {
    const original = this.originalRowState()[this.rowTrackId(row)];
    if (!original) {
      return true;
    }
    return JSON.stringify(this.rowSnapshot(row)) !== JSON.stringify(original);
  }

  private hasAnyInput(row: NonKsLoanRow): boolean {
    const snap = this.rowSnapshot(row);
    return Object.entries(snap).some(([key, value]) => {
      if (NUMERIC_FIELDS.includes(key as keyof RowSnapshot)) {
        return value != null;
      }
      return typeof value === 'string' && value.trim().length > 0;
    });
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

  private nullIfEmpty(value: string): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed ? trimmed : null;
  }

  private parseNumericInput(value: string): number | null {
    const trimmed = value?.trim().replace(/[,$%]/g, '') ?? '';
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
