import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import {
  InvestorAlias,
  InvestorApiService,
  InvestorBulkUpdateRequest,
  InvestorDto,
} from '../../core/services/investor-api.service';

type InvestorRow = {
  investorKey: number;
  investorCode: string;
  investorName: string;
  investorAliasName: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

@Component({
  selector: 'app-investor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor.component.html',
  styleUrl: './investor.component.css',
})
export class InvestorComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);
  private readonly defaultPageSize = 10;

  readonly searchText = signal('');
  readonly selectedInvestorKeys = signal<number[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<InvestorRow[]>([]);
  readonly aliasOptions = signal<InvestorAlias[]>([]);
  readonly originalRowState = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.loadData();
  }

  readonly selectedInvestors = computed(() => {
    const selectedKeys = new Set(this.selectedInvestorKeys());
    return this.rows().filter((row) => selectedKeys.has(row.investorKey));
  });

  readonly searchedInvestorOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedKeys = new Set(this.selectedInvestorKeys());
    return this.rows().filter((row) => {
      if (selectedKeys.has(row.investorKey)) {
        return false;
      }
      return (
        row.investorCode.toLowerCase().includes(keyword) ||
        row.investorName.toLowerCase().includes(keyword) ||
        row.investorAliasName.toLowerCase().includes(keyword)
      );
    });
  });

  readonly filteredRows = computed(() => {
    const selectedKeys = this.selectedInvestorKeys();
    if (selectedKeys.length > 0) {
      const selectedKeySet = new Set(selectedKeys);
      return this.rows().filter((row) => selectedKeySet.has(row.investorKey));
    }

    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return this.rows();
    }

    return this.rows().filter((row) => {
      return (
        row.investorCode.toLowerCase().includes(keyword) ||
        row.investorName.toLowerCase().includes(keyword) ||
        row.investorAliasName.toLowerCase().includes(keyword)
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

  selectInvestor(row: InvestorRow): void {
    if (this.selectedInvestorKeys().includes(row.investorKey)) {
      return;
    }

    this.selectedInvestorKeys.set([...this.selectedInvestorKeys(), row.investorKey]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedInvestor(investorKey: number): void {
    this.selectedInvestorKeys.set(
      this.selectedInvestorKeys().filter((key) => key !== investorKey),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateAlias(investorKey: number, value: string): void {
    this.rows.set(
      this.rows().map((row) =>
        row.investorKey === investorKey
          ? { ...row, investorAliasName: value }
          : row,
      ),
    );
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedInvestorKeys.set([]);
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

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const targetRows = this.filteredRows();
    if (!targetRows.length) {
      this.statusMessage.set('Search and select at least one investor before saving changes.');
      return;
    }

    const changedRows = targetRows.filter((row) => this.hasAliasChanged(row));
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = 'system';
    const request: InvestorBulkUpdateRequest = {
      investors: changedRows.map((row) => ({
        investorKey: row.investorKey,
        investorAliasName: row.investorAliasName.trim(),
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.investorApi.updateInvestorAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const changedKeys = new Set(changedRows.map((row) => row.investorKey));

        this.rows.set(
          this.rows().map((row) =>
            changedKeys.has(row.investorKey)
              ? {
                  ...row,
                  userUpdatedBy,
                  userUpdatedDate: now,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.statusMessage.set(`${changedRows.length} investor(s) updated successfully.`);
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
    this.statusMessage.set('Loading investors...');

    forkJoin({
      investors: this.investorApi.getInvestors(),
      aliases: this.investorApi.getAllAliases(),
    }).subscribe({
      next: ({ investors, aliases }) => {
        const mappedRows = investors
          .map((record, index) => this.mapApiInvestorToRow(record, index))
          .filter((row) => row.investorKey > 0);

        this.rows.set(mappedRows);
        this.aliasOptions.set(aliases);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mappedRows.length > 0
            ? `${mappedRows.length} investor(s) loaded.`
            : 'No investors returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.aliasOptions.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to load investors. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private mapApiInvestorToRow(record: InvestorDto, index: number): InvestorRow {
    return {
      investorKey: record.investorKey > 0 ? record.investorKey : index + 1,
      investorCode: record.investorCode || `INV-${index + 1}`,
      investorName: record.investorName || '-',
      investorAliasName: record.investorAliasName ?? '',
      userUpdatedBy: record.userUpdatedBy?.trim() || '-',
      userUpdatedDate: this.normalizeDate(record.userUpdatedDate ?? ''),
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<number, string> = {};
    for (const row of this.rows()) {
      snapshot[row.investorKey] = row.investorAliasName.trim();
    }
    this.originalRowState.set(snapshot);
  }

  private hasAliasChanged(row: InvestorRow): boolean {
    const original = this.originalRowState()[row.investorKey];
    return row.investorAliasName.trim() !== (original ?? '').trim();
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update investor alias changes.';
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
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
