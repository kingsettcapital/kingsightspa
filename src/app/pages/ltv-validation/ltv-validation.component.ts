import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LtvValidationApiService,
  LtvValidationBulkUpdateRequest,
  LtvValidationRowDto,
} from '../../core/services/ltv-validation-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type LtvValidationRow = {
  loanKey: number;
  parentLoanId: string;
  childLoanId: string;
  description: string;
  loanAliasName: string;
  investorAliasName: string;
  securityValue: number | null;
  exposure: number | null;
  ranking: number | null;
  ltv: number | null;
  aiCommentary: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

const DEFAULT_STATUS_LABEL = 'Default';

@Component({
  selector: 'app-ltv-validation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ltv-validation.component.html',
  styleUrl: './ltv-validation.component.css',
})
export class LtvValidationComponent implements OnInit {
  private readonly ltvApi = inject(LtvValidationApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly defaultPageSize = 10;
  private readonly userUpdatedBy = 'system';

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly searchText = signal('');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<LtvValidationRow[]>([]);
  readonly originalLtvState = signal<Record<number, number | null>>({});

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly isConfirming = signal(false);
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

  readonly confirmableLoanKeys = computed(() =>
    this.rows()
      .filter((row) => !this.hasLtvChanged(row))
      .map((row) => row.loanKey)
      .filter((key) => key > 0),
  );

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

  updateLtv(loanKey: number, value: string): void {
    const parsed = this.parsePercentInput(value);
    this.rows.set(
      this.rows().map((row) => (row.loanKey === loanKey ? { ...row, ltv: parsed } : row)),
    );
    this.clearMessages();
  }

  saveChanges(): void {
    if (this.isSaving() || !this.rows().length) {
      return;
    }

    const changedRows = this.rows().filter((row) => this.hasLtvChanged(row));
    if (!changedRows.length) {
      this.statusMessage.set('No LTV changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const request: LtvValidationBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        ltv: row.ltv,
        userUpdatedBy: this.userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    this.ltvApi.saveLtv(request).subscribe({
      next: () => {
        this.snapshotOriginalLtv();
        this.statusMessage.set(`${changedRows.length} loan(s) updated successfully.`);
        this.isSaving.set(false);
        this.loadGrid();
      },
      error: (error) => {
        this.errorMessage.set(this.extractBackendError(error));
        this.isSaving.set(false);
      },
    });
  }

  confirmAiLtv(): void {
    if (this.isConfirming() || !this.rows().length) {
      return;
    }

    const loanKeys = this.confirmableLoanKeys();
    if (!loanKeys.length) {
      this.statusMessage.set('No unmodified rows available to confirm. Save manual LTV edits first.');
      this.errorMessage.set('');
      return;
    }

    this.isConfirming.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    this.ltvApi.confirmAiLtv({ loanKeys, userUpdatedBy: this.userUpdatedBy }).subscribe({
      next: () => {
        this.statusMessage.set(`${loanKeys.length} loan(s) confirmed with AI-extracted LTV.`);
        this.isConfirming.set(false);
        this.loadGrid();
      },
      error: (error) => {
        this.errorMessage.set(this.extractBackendError(error, 'Failed to confirm AI LTV values.'));
        this.isConfirming.set(false);
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
      return '-';
    }
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatPercent(value: number | null): string {
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

  formatRanking(value: number | null): string {
    if (value == null || !Number.isFinite(value) || value <= 0) {
      return '-';
    }
    return String(value);
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
            .map((a) => ({
              loanAliasId: Number(a.loanAliasId ?? a.loanAliasKey ?? 0),
              loanAliasName: a.loanAliasName?.trim() || '-',
            }))
            .filter((a) => a.loanAliasId > 0)
            .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName)),
        );
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set(this.resolveDefaultStatusValues(this.statusOptions()));
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
      this.originalLtvState.set({});
      this.statusMessage.set('No loan aliases available to load.');
      return;
    }

    if (!statuses.length) {
      this.rows.set([]);
      this.originalLtvState.set({});
      this.statusMessage.set('Select at least one status to load loans.');
      return;
    }

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.ltvApi.getLoans(loanAliasIds, statuses).subscribe({
      next: (response) => {
        const records = this.normalizeRecords(response);
        const mapped = records.map((r) => this.mapRow(r));
        const sorted = this.sortRows(mapped);
        this.rows.set(sorted);
        this.currentPage.set(1);
        this.snapshotOriginalLtv();
        this.statusMessage.set(
          sorted.length > 0
            ? `${sorted.length} loan(s) loaded.`
            : 'No loans returned for the selected filters.',
        );
        this.isLoadingGrid.set(false);
      },
      error: (error) => {
        this.rows.set([]);
        this.originalLtvState.set({});
        this.errorMessage.set(this.extractBackendError(error));
        this.isLoadingGrid.set(false);
      },
    });
  }

  private sortRows(rows: LtvValidationRow[]): LtvValidationRow[] {
    return [...rows].sort((a, b) => {
      const aEmpty = a.securityValue == null;
      const bEmpty = b.securityValue == null;
      if (aEmpty && !bEmpty) {
        return -1;
      }
      if (!aEmpty && bEmpty) {
        return 1;
      }
      const aSec = a.securityValue ?? 0;
      const bSec = b.securityValue ?? 0;
      if (bSec !== aSec) {
        return bSec - aSec;
      }
      const aRank = a.ranking ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.ranking ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }

  private normalizeRecords(response: unknown): LtvValidationRowDto[] {
    if (Array.isArray(response)) {
      return response as LtvValidationRowDto[];
    }
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      for (const key of ['loans', 'data', 'results', 'items', 'value']) {
        const candidate = obj[key];
        if (Array.isArray(candidate)) {
          return candidate as LtvValidationRowDto[];
        }
      }
    }
    return [];
  }

  private mapRow(record: LtvValidationRowDto): LtvValidationRow {
    const raw = record as LtvValidationRowDto & Record<string, unknown>;
    const loanKey = this.pickNumber(raw, 'loanKey', 'LoanKey');
    const childLoanId =
      this.pickString(raw, 'childLoanId', 'ChildLoanId', 'loanId', 'LoanId') || '-';
    return {
      loanKey,
      parentLoanId: this.pickString(raw, 'parentLoanId', 'ParentLoanId') || '-',
      childLoanId,
      description: this.pickString(raw, 'description', 'Description') || '-',
      loanAliasName: this.pickString(raw, 'loanAliasName', 'LoanAliasName') || '-',
      investorAliasName:
        this.pickString(raw, 'investorAliasName', 'InvestorAliasName') || '-',
      securityValue: this.pickNullableNumber(raw, 'securityValue', 'SecurityValue'),
      exposure: this.pickNullableNumber(raw, 'exposure', 'Exposure'),
      ranking: this.pickNullableNumber(raw, 'ranking', 'Ranking', 'loanRanking', 'LoanRanking'),
      ltv: this.pickNullableNumber(raw, 'ltv', 'Ltv', 'LTV'),
      aiCommentary: this.pickString(raw, 'aiCommentary', 'AiCommentary', 'AICommentary') || '-',
      userUpdatedBy: this.pickString(raw, 'userUpdatedBy', 'UserUpdatedBy') || '-',
      userUpdatedDate: this.pickString(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
  }

  private snapshotOriginalLtv(): void {
    const snapshot: Record<number, number | null> = {};
    for (const row of this.rows()) {
      if (row.loanKey > 0) {
        snapshot[row.loanKey] = row.ltv;
      }
    }
    this.originalLtvState.set(snapshot);
  }

  private hasLtvChanged(row: LtvValidationRow): boolean {
    return row.ltv !== (this.originalLtvState()[row.loanKey] ?? null);
  }

  private parsePercentInput(value: string): number | null {
    const trimmed = value?.trim().replace(/%/g, '') ?? '';
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.min(100, Math.max(0, parsed));
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

  private extractBackendError(
    error: unknown,
    fallback = 'Failed to load or save LTV validation data.',
  ): string {
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
