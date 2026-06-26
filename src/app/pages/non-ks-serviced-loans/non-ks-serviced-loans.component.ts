import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

type NonKsLoanRow = {
  stableRowKey: string;
  nonKsServicedLoanKey: string;
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

type RowSnapshot = Omit<
  NonKsLoanRow,
  'stableRowKey' | 'nonKsServicedLoanKey' | 'clientRowId' | 'userUpdatedBy' | 'userUpdatedDate'
>;

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
  imports: [CommonModule, FormsModule],
  templateUrl: './non-ks-serviced-loans.component.html',
  styleUrl: './non-ks-serviced-loans.component.css',
})
export class NonKsServicedLoansComponent implements OnInit {
  private readonly api = inject(NonKsServicedLoansApiService);
  private readonly loansApi = inject(LoansApiService);
  private readonly investorApi = inject(InvestorApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;
  private nextClientRowId = -1;

  readonly rows = signal<NonKsLoanRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});
  readonly loanAliasOptions = signal<LoanAliasOptionDto[]>([]);
  readonly investorAliasOptions = signal<InvestorAlias[]>([]);

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  private pendingExtLoanCode = signal('NONKS-1');

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
    if (row.stableRowKey) {
      return `key-${row.stableRowKey}`;
    }
    return `new-${row.clientRowId}`;
  }

  isNewRow(row: NonKsLoanRow): boolean {
    return !row.stableRowKey;
  }

  addRow(): void {
    const loanId = this.pendingExtLoanCode();
    const row = { ...this.emptyRow(this.nextClientRowId), loanId };
    this.nextClientRowId -= 1;
    this.pendingExtLoanCode.set(
      `NONKS-${this.parseExtLoanCodeNumber(loanId) + 1}`,
    );
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
    this.syncPendingExtLoanCode();
    this.clearMessages();
  }

  updateTextField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: value } as Partial<NonKsLoanRow>);
  }

  updateDateField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: value.trim() } as Partial<NonKsLoanRow>);
  }

  updateCurrencyField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: this.parseCurrencyInput(value) } as Partial<NonKsLoanRow>);
  }

  updatePercentField(row: NonKsLoanRow, value: string): void {
    this.patchRow(row, { interestRate: this.parsePercentInput(value) });
  }

  updateIntegerField(row: NonKsLoanRow, field: keyof RowSnapshot, value: string): void {
    this.patchRow(row, { [field]: this.parseIntegerInput(value) } as Partial<NonKsLoanRow>);
  }

  updateDecimalField(
    row: NonKsLoanRow,
    field: keyof RowSnapshot,
    value: string,
    fractionDigits: number,
  ): void {
    this.patchRow(row, {
      [field]: this.parseDecimalInput(value, fractionDigits),
    } as Partial<NonKsLoanRow>);
  }

  normalizeCurrencyField(
    row: NonKsLoanRow,
    field: keyof RowSnapshot,
    input: HTMLInputElement,
  ): void {
    const parsed = this.parseCurrencyInput(input.value);
    this.patchRow(row, { [field]: parsed } as Partial<NonKsLoanRow>);
    input.value = this.formatCurrencyInput(parsed);
  }

  normalizePercentField(row: NonKsLoanRow, input: HTMLInputElement): void {
    const parsed = this.parsePercentInput(input.value);
    this.patchRow(row, { interestRate: parsed });
    input.value = this.formatPercentInput(parsed);
  }

  normalizeIntegerField(
    row: NonKsLoanRow,
    field: keyof RowSnapshot,
    input: HTMLInputElement,
  ): void {
    const parsed = this.parseIntegerInput(input.value);
    this.patchRow(row, { [field]: parsed } as Partial<NonKsLoanRow>);
    input.value = this.formatIntegerInput(parsed);
  }

  normalizeDecimalField(
    row: NonKsLoanRow,
    field: keyof RowSnapshot,
    input: HTMLInputElement,
    fractionDigits: number,
  ): void {
    const parsed = this.parseDecimalInput(input.value, fractionDigits);
    this.patchRow(row, { [field]: parsed } as Partial<NonKsLoanRow>);
    input.value = this.formatDecimalInput(parsed, fractionDigits);
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

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isSaving.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    const requests = [];
    if (newRows.length) {
      requests.push(
        this.api
          .createLoans({ loans: newRows.map((row) => this.toPayload(row, userUpdatedBy)) })
          .pipe(catchError((error) => {
            throw error;
          })),
      );
    }
    if (changedRows.length) {
      requests.push(
        this.api
          .updateLoans({
            loans: changedRows.map((row) => {
              const original = this.originalRowState()[this.rowTrackId(row)];
              return {
                ...this.toPayload(row, userUpdatedBy),
                nonKsServicedLoanKey: row.stableRowKey || null,
                originalAsAtDate: this.nullIfEmpty(original?.asAtDate ?? ''),
              };
            }),
          })
          .pipe(catchError((error) => {
            throw error;
          })),
      );
    }

    const savedPage = this.currentPage();
    let resultIndex = 0;

    forkJoin(requests.length ? requests : [of(null)]).subscribe({
      next: (results) => {
        const savedRecords: NonKsServicedLoanDto[] = [];
        if (newRows.length) {
          const created = results[resultIndex++];
          if (Array.isArray(created)) {
            savedRecords.push(...created);
          }
        }
        if (changedRows.length) {
          const updated = results[resultIndex++];
          if (Array.isArray(updated)) {
            savedRecords.push(...updated);
          }
        }

        const parts = [];
        if (newRows.length) {
          parts.push(`${newRows.length} created`);
        }
        if (changedRows.length) {
          parts.push(`${changedRows.length} updated`);
        }
        this.statusMessage.set(`Save successful: ${parts.join(', ')}.`);
        this.isSaving.set(false);
        this.loadGrid(savedPage, savedRecords);
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
      stableRowKey: '',
      nonKsServicedLoanKey: '',
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
      loanId: this.pickString(raw, 'loanId', 'LoanId', 'extLoanCode', 'ExtLoanCode'),
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
      interestAsOfTaxMemo: this.pickNullableNumber(
        raw,
        'interestAsOfTaxMemo',
        'InterestAsOfTaxMemo',
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

  private toPayload(row: NonKsLoanRow, userUpdatedBy: string): NonKsServicedLoanPayload {
    const loanAlias = this.nullIfEmpty(row.loanName);
    const investorAlias = this.nullIfEmpty(row.investor);
    return {
      loanAliasName: loanAlias,
      loanName: loanAlias,
      asAtDate: this.nullIfEmpty(row.asAtDate),
      loanId: this.isNewRow(row) ? null : this.nullIfEmpty(row.loanId),
      servicerId: this.nullIfEmpty(row.servicerId),
      description: this.nullIfEmpty(row.description),
      investorAliasName: investorAlias,
      investor: investorAlias,
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
      userUpdatedBy,
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
      if (key === 'loanId') {
        return typeof value === 'string' && value.trim().length > 0;
      }
      return typeof value === 'string' && value.trim().length > 0;
    });
  }

  private syncPendingExtLoanCode(apiNext = this.pendingExtLoanCode()): void {
    let nextNumber = this.parseExtLoanCodeNumber(apiNext) || 1;
    for (const row of this.rows()) {
      const rowNumber = this.parseExtLoanCodeNumber(row.loanId);
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

  private parseCurrencyInput(value: string): number | null {
    const trimmed = value.replace(/[$,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
  }

  private parseIntegerInput(value: string): number | null {
    const trimmed = value.replace(/[,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseDecimalInput(value: string, fractionDigits: number): number | null {
    const trimmed = value.replace(/[,\s]/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(fractionDigits)) : null;
  }

  private parsePercentInput(value: string): number | null {
    const trimmed = value.replace(/%/g, '').trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null;
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
    const loanId = this.pickString(raw, 'loanId', 'LoanId', 'extLoanCode', 'ExtLoanCode');
    const asAtDate = this.toDateInputValue(
      this.pickString(raw, 'asAtDate', 'AsAtDate', 'asOfDate', 'AsOfDate') || null,
    );
    return `${loanId}|${asAtDate}`;
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
