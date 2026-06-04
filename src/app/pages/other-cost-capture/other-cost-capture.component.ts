import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

type EditableCosts = {
  outstandingInvoices: number | null;
  estRealizationCosts: number | null;
  costToComplete: number | null;
};

type OtherCostRow = {
  loanKey: number;
  loanId: string;
  description: string;
  loanAliasName: string;
} & EditableCosts & {
    userUpdatedBy: string;
    userUpdatedDate: string;
  };

const DEFAULT_STATUS_LABEL = 'Default';

@Component({
  selector: 'app-other-cost-capture',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './other-cost-capture.component.html',
  styleUrl: './other-cost-capture.component.css',
})
export class OtherCostCaptureComponent implements OnInit {
  private readonly otherCostApi = inject(OtherCostCaptureApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly defaultPageSize = 10;
  private readonly userUpdatedBy = 'system';

  readonly aliasOptions = signal<LoanAlias[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly selectedLoanAliasId = signal<number | null>(null);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<OtherCostRow[]>([]);
  readonly originalRowState = signal<Record<number, EditableCosts>>({});

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly selectedAliasName = computed(() => {
    const id = this.selectedLoanAliasId();
    if (id == null) {
      return '';
    }
    return this.aliasOptions().find((a) => this.getAliasId(a) === id)?.loanAliasName ?? '';
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

  ngOnInit(): void {
    this.loadFilters();
  }

  onLoanAliasChange(value: string): void {
    const parsed = Number(value);
    this.selectedLoanAliasId.set(Number.isFinite(parsed) && parsed > 0 ? parsed : null);
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

  updateCostField(
    loanKey: number,
    field: keyof EditableCosts,
    rawValue: string,
  ): void {
    const parsed = this.parseNumericInput(rawValue);
    this.rows.set(
      this.rows().map((row) =>
        row.loanKey === loanKey ? { ...row, [field]: parsed } : row,
      ),
    );
    this.clearMessages();
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

    const request: OtherCostCaptureBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        outstandingInvoices: row.outstandingInvoices,
        estRealizationCosts: row.estRealizationCosts,
        costToComplete: row.costToComplete,
        userUpdatedBy: this.userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.otherCostApi.saveCosts(request).subscribe({
      next: () => {
        this.snapshotOriginalState();
        this.statusMessage.set(`${changedRows.length} loan(s) updated successfully.`);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadGrid();
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

  formatCurrency(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatNumber(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }

  formatDate(value: string): string {
    if (!value?.trim()) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${month}/${day}/${year}`;
  }

  getAliasId(alias: LoanAlias): number {
    return Number(alias.loanAliasId ?? alias.loanAliasKey ?? 0);
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
          aliases.filter((a) => this.getAliasId(a) > 0).sort((a, b) =>
            a.loanAliasName.localeCompare(b.loanAliasName),
          ),
        );
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set(this.resolveDefaultStatusValues(this.statusOptions()));
        this.isLoadingFilters.set(false);
      },
      error: () => {
        this.isLoadingFilters.set(false);
        this.errorMessage.set('Unable to load filters.');
      },
    });
  }

  private loadGrid(): void {
    const loanAliasId = this.selectedLoanAliasId();
    const statuses = this.selectedStatuses();

    if (loanAliasId == null) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('Select a loan alias to load loan syndicate details.');
      return;
    }

    if (!statuses.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('Select at least one status to load loans.');
      return;
    }

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.otherCostApi.getLoans(loanAliasId, statuses).subscribe({
      next: (records) => {
        const mapped = records.map((r) => this.mapRow(r));
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
    return {
      loanKey: Number(record.loanKey),
      loanId: record.loanId?.trim() || '-',
      description: record.description?.trim() || '-',
      loanAliasName: record.loanAliasName?.trim() || this.selectedAliasName() || '-',
      outstandingInvoices: this.toNumber(record.outstandingInvoices),
      estRealizationCosts: this.toNumber(record.estRealizationCosts),
      costToComplete: this.toNumber(record.costToComplete),
      userUpdatedBy: record.userUpdatedBy?.trim() || '-',
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

  private snapshotOriginalState(): void {
    const snapshot: Record<number, EditableCosts> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        outstandingInvoices: row.outstandingInvoices,
        estRealizationCosts: row.estRealizationCosts,
        costToComplete: row.costToComplete,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private hasRowChanged(row: OtherCostRow): boolean {
    const original = this.originalRowState()[row.loanKey];
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

  private parseNumericInput(value: string): number | null {
    const trimmed = value.trim().replace(/,/g, '');
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
