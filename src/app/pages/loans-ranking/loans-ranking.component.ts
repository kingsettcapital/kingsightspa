import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanApiRecord, LoansApiService } from '../../core/services/loans-api.service';
import { forkJoin } from 'rxjs';

type LoanRankingRow = {
  loanKey: string;
  loanCode: string;
  investorName: string;
  loanDescription: string;
  loanName: string;
  loanAlias: string;
  ranking: number;
  dateUpdated: string;
  updatedBy: string;
};

type LoanUpdatePayload = {
  LoanAliasName?: string;
  LoanRanking?: number | null;
  UserUpdatedDate?: string;
  UserUpdatedBy?: string;
};

@Component({
  selector: 'app-loans-ranking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loans-ranking.component.html',
  styleUrl: './loans-ranking.component.css',
})
export class LoansRankingComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly searchText = signal('');
  readonly selectedLoanKeys = signal<string[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<LoanRankingRow[]>([]);
  readonly originalRowState = signal<Record<string, { loanAlias: string; ranking: number }>>({});

  ngOnInit(): void {
    this.loadLoans();
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
        row.loanKey.toLowerCase().includes(keyword) ||
        row.loanCode.toLowerCase().includes(keyword) ||
        row.loanName.toLowerCase().includes(keyword) ||
        row.investorName.toLowerCase().includes(keyword)
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
        row.loanKey.toLowerCase().includes(keyword) ||
        row.loanName.toLowerCase().includes(keyword) ||
        row.investorName.toLowerCase().includes(keyword) ||
        row.loanDescription.toLowerCase().includes(keyword) ||
        row.loanAlias.toLowerCase().includes(keyword)
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
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  selectLoan(row: LoanRankingRow): void {
    if (this.selectedLoanKeys().includes(row.loanKey)) {
      return;
    }

    this.selectedLoanKeys.set([...this.selectedLoanKeys(), row.loanKey]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  removeSelectedLoan(loanKey: string): void {
    this.selectedLoanKeys.set(
      this.selectedLoanKeys().filter((selectedKey) => selectedKey !== loanKey),
    );
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  updateAlias(loanKey: string, value: string): void {
    this.rows.set(
      this.rows().map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              loanAlias: value,
            }
          : row,
      ),
    );
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  updateRanking(loanKey: string, value: string): void {
    const parsedValue = Number(value);
    this.rows.set(
      this.rows().map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              ranking: Number.isFinite(parsedValue) && parsedValue > 0 ? 0 : 0,
            }
          : row,
      ),
    );
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanKeys.set([]);
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
  }

  goToNextPage(): void {
    const maxPage = this.totalPages();
    this.currentPage.set(Math.min(maxPage, this.currentPage() + 1));
  }

  updatePageSize(value: string): void {
    const parsed = Number(value);
    const normalized = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : this.defaultPageSize;
    this.pageSize.set(normalized);
    this.currentPage.set(1);
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const targetRows = this.filteredRows();
    if (!targetRows.length) {
      this.statusMessage.set('Search and select at least one loan before saving changes.');
      return;
    }

    const changedRows = targetRows.filter((row) => this.getChangedFields(row) !== null);
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    const updateRequests = changedRows.map((row) => {
      const payload = this.getChangedFields(row);
      return this.loansApi.updateLoan(row.loanKey, payload ?? {});
    });

    forkJoin(updateRequests).subscribe({
      next: () => {
        const now = new Date().toISOString().slice(0, 10);
        const changedLoanKeys = new Set(changedRows.map((row) => row.loanKey));

        this.rows.set(
          this.rows().map((row) =>
            changedLoanKeys.has(row.loanKey)
              ? {
                  ...row,
                  loanAlias: row.loanAlias.trim() || row.investorName,
                  ranking: row.ranking > 0 ? row.ranking : 1,
                  dateUpdated: now,
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

  private loadLoans(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('Loading loans...');

    this.loansApi.getLoans().subscribe({
      next: (response) => {
        const mappedRows = response
          .map((loan, index) => this.mapApiLoanToRow(loan, index))
          .filter((row) => row.loanKey.length > 0);

        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mappedRows.length > 0 ? `${mappedRows.length} loan(s) loaded.` : 'No loans returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to fetch loans. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private mapApiLoanToRow(record: LoanApiRecord, index: number): LoanRankingRow {
    const loanKey = this.getRecordValue(record, ['loanKey', 'LoanKey']);
    const loanCode = this.getRecordValue(record, ['loanCode', 'LoanCode']);
    const investorName = this.getRecordValue(record, [
      'investorName',
      'InvestorName',
      'investor',
      'Investor',
      'clientName',
      'ClientName',
    ]);
    const loanDescription = this.getRecordValue(record, [
      'loanDescription',
      'LoanDescription',
      'loanDesc',
      'LoanDesc',
    ]);
    const loanName = this.getRecordValue(record, ['loanName', 'LoanName', 'loanDesc', 'LoanDesc']);
    const loanAlias = this.getRecordValue(record, [
      'loanAlias',
      'LoanAlias',
      'loanAliasName',
      'LoanAliasName',
      'alias',
      'Alias',
    ]);
    const rankingRaw = this.getRecordValue(record, [
      'ranking',
      'Ranking',
      'loanRanking',
      'LoanRanking',
      'rank',
      'Rank',
    ]);
    const dateUpdated = this.getRecordValue(record, [
      'dateUpdated',
      'DateUpdated',
      'userUpdatedDate',
      'UserUpdatedDate',
      'updatedOn',
      'UpdatedOn',
      'lastUpdated',
      'LastUpdated',
    ]);
    const updatedBy = this.getRecordValue(record, [
      'updatedBy',
      'UpdatedBy',
      'userUpdatedBy',
      'UserUpdatedBy',
      'modifiedBy',
      'ModifiedBy',
      'createdBy',
      'CreatedBy',
    ]);

    const parsedRanking = Number(rankingRaw);
    return {
      loanKey: loanKey || `LOANKEY-${index + 1}`,
      loanCode: loanCode || loanKey || `LOAN-${index + 1}`,
      investorName: investorName || '-',
      loanDescription: loanDescription || loanName || '-',
      loanName: loanName || loanDescription || loanCode || loanKey || '-',
      loanAlias: loanAlias || loanDescription || '',
      ranking: Number.isFinite(parsedRanking) && parsedRanking > 0 ? parsedRanking : 0,
      dateUpdated: this.normalizeDate(dateUpdated),
      updatedBy: updatedBy || '-',
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, { loanAlias: string; ranking: number }> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        loanAlias: row.loanAlias.trim(),
        ranking: row.ranking,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: LoanRankingRow): LoanUpdatePayload | null {
    const original = this.originalRowState()[row.loanKey];
    const normalizedAlias = row.loanAlias.trim() || row.investorName;
    const normalizedRanking = this.normalizeRanking(row.ranking);
    const updatedBy = this.currentAppUser.getUpdatedBy() ?? row.updatedBy;
    if (!updatedBy || updatedBy === '-') {
      return null;
    }
    const updatedDate = new Date().toISOString();

    if (!original) {
      return {
        LoanAliasName: normalizedAlias,
        LoanRanking: normalizedRanking,
        UserUpdatedDate: updatedDate,
        UserUpdatedBy: updatedBy,
      };
    }

    const payload: LoanUpdatePayload = {};

    if (normalizedAlias !== original.loanAlias) {
      payload.LoanAliasName = normalizedAlias;
    }
    if (normalizedRanking !== original.ranking) {
      payload.LoanRanking = normalizedRanking;
    }

    if (Object.keys(payload).length > 0) {
      payload.UserUpdatedDate = updatedDate;
      payload.UserUpdatedBy = updatedBy;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private normalizeRanking(ranking: number): number {
    const asWholeNumber = Number.isFinite(ranking) ? Math.trunc(ranking) : 1;
    return Math.min(32767, Math.max(1, asWholeNumber));
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update loan changes.';
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

  private getRecordValue(record: LoanApiRecord, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }
    return '';
  }

  private normalizeDate(value: string): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().slice(0, 10);
  }
}
