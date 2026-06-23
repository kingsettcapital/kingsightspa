import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LoanBulkUpdateRequest,
  LoanDto,
  LoansApiService,
} from '../../core/services/loans-api.service';

type LoanRow = {
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasKey: number | null;
  loanAliasName: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

@Component({
  selector: 'app-loan-alias-assignment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loan-alias-assignment.component.html',
  styleUrl: './loan-alias-assignment.component.css',
})
export class LoanAliasAssignmentComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly searchText = signal('');
  readonly selectedLoanKeys = signal<number[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<LoanRow[]>([]);
  readonly aliasOptions = signal<LoanAlias[]>([]);
  readonly originalRowState = signal<Record<number, number | null>>({});

  ngOnInit(): void {
    this.loadData();
  }

  readonly selectedLoans = computed(() => {
    const selectedKeys = new Set(this.selectedLoanKeys());
    return this.rows().filter((row) => selectedKeys.has(row.loanKey));
  });

  readonly searchedLoanOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedKeys = new Set(this.selectedLoanKeys());
    return this.rows().filter((row) => {
      if (selectedKeys.has(row.loanKey)) {
        return false;
      }
      return (
        row.loanCode.toLowerCase().includes(keyword) ||
        row.loanName.toLowerCase().includes(keyword) ||
        row.loanAliasName.toLowerCase().includes(keyword)
      );
    });
  });

  readonly filteredRows = computed(() => {
    const selectedKeys = this.selectedLoanKeys();
    if (selectedKeys.length > 0) {
      const selectedKeySet = new Set(selectedKeys);
      return this.rows().filter((row) => selectedKeySet.has(row.loanKey));
    }

    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return this.rows();
    }

    return this.rows().filter((row) => {
      return (
        row.loanCode.toLowerCase().includes(keyword) ||
        row.loanName.toLowerCase().includes(keyword) ||
        row.loanAliasName.toLowerCase().includes(keyword)
      );
    });
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

  selectLoan(row: LoanRow): void {
    if (this.selectedLoanKeys().includes(row.loanKey)) {
      return;
    }

    this.selectedLoanKeys.set([...this.selectedLoanKeys(), row.loanKey]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedLoan(loanKey: number): void {
    this.selectedLoanKeys.set(
      this.selectedLoanKeys().filter((key) => key !== loanKey),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateAlias(loanKey: number, value: string): void {
    const loanAliasKey = value ? Number(value) : null;
    const alias = this.aliasOptions().find((a) => this.getAliasKey(a) === loanAliasKey);
    this.rows.set(
      this.rows().map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              loanAliasKey,
              loanAliasName: alias?.loanAliasName ?? '',
            }
          : row,
      ),
    );
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanKeys.set([]);
    this.currentPage.set(1);
    this.clearMessages();
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

  getAliasKey(alias: LoanAlias): number {
    const key = alias.loanAliasKey ?? alias.loanAliasId;
    return key != null ? Number(key) : 0;
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const targetRows = this.filteredRows();
    if (!targetRows.length) {
      this.statusMessage.set('Search and select at least one loan before saving changes.');
      return;
    }

    const changedRows = targetRows.filter((row) => this.hasAliasChanged(row));
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

    const request: LoanBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        loanAliasKey: row.loanAliasKey ?? 0,
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.loansApi.updateLoanAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const changedKeys = new Set(changedRows.map((row) => row.loanKey));

        this.rows.set(
          this.rows().map((row) =>
            changedKeys.has(row.loanKey)
              ? {
                  ...row,
                  userUpdatedBy,
                  userUpdatedDate: this.normalizeDate(now),
                }
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

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('Loading loans...');

    forkJoin({
      loans: this.loansApi.getLoans(),
      aliases: this.loanAliasApi.getAllAliases(),
    }).subscribe({
      next: ({ loans, aliases }) => {
        const normalizedAliases = this.normalizeAliases(aliases);
        const mappedRows = loans
          .map((record, index) => this.mapApiLoanToRow(record, index, normalizedAliases))
          .filter((row) => row.loanKey > 0);

        this.rows.set(mappedRows);
        this.aliasOptions.set(normalizedAliases);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mappedRows.length > 0
            ? `${mappedRows.length} loan(s) loaded.`
            : 'No loans returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.aliasOptions.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to load loans. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private mapApiLoanToRow(
    record: LoanDto,
    index: number,
    aliases: LoanAlias[],
  ): LoanRow {
    const loanAliasKey =
      record.loanAliasKey != null && Number(record.loanAliasKey) > 0
        ? Number(record.loanAliasKey)
        : this.resolveAliasKey(record.loanAliasName, aliases);
    const alias = aliases.find((a) => this.getAliasKey(a) === loanAliasKey);

    return {
      loanKey: record.loanKey > 0 ? record.loanKey : index + 1,
      loanCode: record.loanCode || `LOAN-${index + 1}`,
      loanName: record.loanDesc?.trim() || '-',
      loanAliasKey,
      loanAliasName: alias?.loanAliasName ?? record.loanAliasName?.trim() ?? '',
      userUpdatedBy: record.userUpdatedBy?.trim() || '-',
      userUpdatedDate: this.normalizeDate(record.userUpdatedDate ?? ''),
    };
  }

  private resolveAliasKey(
    aliasName: string | null | undefined,
    aliases: LoanAlias[],
  ): number | null {
    const normalized = aliasName?.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    const match = aliases.find((a) => a.loanAliasName.trim().toLowerCase() === normalized);
    return match ? this.getAliasKey(match) : null;
  }

  private normalizeAliases(aliases: LoanAlias[]): LoanAlias[] {
    return aliases.map((alias) => {
      const key = this.getAliasKey(alias);
      return {
        ...alias,
        loanAliasKey: key,
        loanAliasId: key,
      };
    });
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<number, number | null> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = row.loanAliasKey;
    }
    this.originalRowState.set(snapshot);
  }

  private hasAliasChanged(row: LoanRow): boolean {
    const original = this.originalRowState()[row.loanKey];
    return row.loanAliasKey !== (original ?? null);
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update loan alias changes.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as {
      error?: { message?: string; title?: string; detail?: string } | string;
      message?: string;
    };

    if (typeof maybeError.error === 'string' && maybeError.error.trim().length > 0) {
      return maybeError.error;
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

  private normalizeDate(value: string): string {
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
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
