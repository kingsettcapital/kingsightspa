import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  InvestorAliasBulkUpdateRequest,
  InvestorAliasRow,
  InvestorAliasUpdatePayload,
  InvestorApiService,
} from '../../core/services/investor-api.service';


@Component({
  selector: 'app-investor-alias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor-alias.component.html',
  styleUrl: './investor-alias.component.css',
})
export class InvestorAliasComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);
  private readonly defaultPageSize = 10;
  private readonly defaultUpdatedBy = 'system';

  readonly searchText = signal('');
  readonly selectedInvestorKeys = signal<number[]>([]);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<InvestorAliasRow[]>([]);
  readonly originalRowState = signal<Record<number, { investor_alias_name: string }>>({});

  ngOnInit(): void {
    this.loadInvestors();
  }

  readonly selectedInvestors = computed(() => {
    const selectedKeys = new Set(this.selectedInvestorKeys());
    return this.rows().filter((row) => selectedKeys.has(row.investor_key));
  });

  readonly searchedInvestorOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedKeys = new Set(this.selectedInvestorKeys());
    return this.rows().filter((row) => {
      if (selectedKeys.has(row.investor_key)) {
        return false;
      }
      return row.investor_name.toLowerCase().includes(keyword);
    });
  });

  readonly filteredRows = computed(() => {
    const selectedKeys = this.selectedInvestorKeys();
    if (selectedKeys.length > 0) {
      const selectedKeySet = new Set(selectedKeys);
      return this.rows().filter((row) => selectedKeySet.has(row.investor_key));
    }

    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return this.rows();
    }

    return this.rows().filter((row) => row.investor_name.toLowerCase().includes(keyword));
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

  /** True when any investor alias differs from the last loaded/saved snapshot (entire grid). */
  readonly hasPendingAliasChanges = computed(() => {
    for (const row of this.rows()) {
      if (this.isAliasChanged(row)) {
        return true;
      }
    }
    return false;
  });

  readonly dirtyInvestorKeySet = computed(() => {
    const keys = new Set<number>();
    for (const row of this.rows()) {
      if (this.isAliasChanged(row)) {
        keys.add(row.investor_key);
      }
    }
    return keys;
  });

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  selectInvestor(row: InvestorAliasRow): void {
    if (this.selectedInvestorKeys().includes(row.investor_key)) {
      return;
    }

    this.selectedInvestorKeys.set([...this.selectedInvestorKeys(), row.investor_key]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  removeSelectedInvestor(investorKey: number): void {
    this.selectedInvestorKeys.set(
      this.selectedInvestorKeys().filter((selectedKey) => selectedKey !== investorKey),
    );
    this.currentPage.set(1);
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  updateInvestorAlias(investorKey: number, value: string): void {
    this.rows.set(
      this.rows().map((row) =>
        row.investor_key === investorKey
          ? {
              ...row,
              investor_alias_name: value,
            }
          : row,
      ),
    );
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedInvestorKeys.set([]);
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

    const changedRows = this.collectChangedRowsAcrossGrid();
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    const payloads: InvestorAliasUpdatePayload[] = changedRows.map(
      (row) => this.buildChangedPayload(row)!,
    );
    const request: InvestorAliasBulkUpdateRequest = { Investors: payloads };
    const payloadByKey = new Map(payloads.map((payload) => [payload.investor_key, payload]));

    this.investorApi.updateInvestorAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString().slice(0, 10);
        const changedKeys = new Set(changedRows.map((row) => row.investor_key));

        this.rows.set(
          this.rows().map((row) =>
            changedKeys.has(row.investor_key)
              ? {
                  ...row,
                  investor_alias_name: row.investor_alias_name.trim() || row.investor_name,
                  user_updated_date: now,
                  user_updated_by: payloadByKey.get(row.investor_key)?.user_updated_by ?? row.user_updated_by,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.statusMessage.set('Investor alias updates saved successfully.');
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

  private loadInvestors(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('Loading investors...');

    this.investorApi.getInvestors().subscribe({
      next: (response) => {
        const mappedRows = response
          .map((record) => this.mapApiInvestorToRow(record))
          .filter((row) => Number.isFinite(row.investor_key) && row.investor_key > 0);

        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.statusMessage.set(
          mappedRows.length > 0 ? `${mappedRows.length} investor(s) loaded.` : 'No investors returned.',
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to fetch investors. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private mapApiInvestorToRow(record: InvestorAliasRow): InvestorAliasRow {
    return {
      investor_key: Number(record.investor_key),
      investor_code: record.investor_code || '-',
      investor_name: record.investor_name || '-',
      investor_alias_name: record.investor_alias_name || '',
      user_updated_date: this.normalizeDate(record.user_updated_date),
      user_updated_by: record.user_updated_by || '-',
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<number, { investor_alias_name: string }> = {};
    for (const row of this.rows()) {
      snapshot[row.investor_key] = {
        investor_alias_name: row.investor_alias_name.trim(),
      };
    }
    this.originalRowState.set(snapshot);
  }

  /** All investors with a pending alias edit, including rows not visible under the current search. */
  private collectChangedRowsAcrossGrid(): InvestorAliasRow[] {
    return this.rows().filter((row) => this.isAliasChanged(row));
  }

  private isAliasChanged(row: InvestorAliasRow): boolean {
    const original = this.originalRowState()[row.investor_key];
    const currentAlias = row.investor_alias_name.trim();
    const baselineAlias = original?.investor_alias_name ?? '';
    return currentAlias !== baselineAlias;
  }

  private buildChangedPayload(row: InvestorAliasRow): InvestorAliasUpdatePayload | null {
    if (!this.isAliasChanged(row)) {
      return null;
    }

    const normalizedAlias = row.investor_alias_name.trim() || row.investor_name;
    const updatedBy =
      row.user_updated_by && row.user_updated_by.trim().length > 0 && row.user_updated_by !== '-'
        ? row.user_updated_by
        : this.defaultUpdatedBy;
    return {
      investor_key: row.investor_key,
      investor_alias_name: normalizedAlias,
      user_updated_date: new Date().toISOString(),
      user_updated_by: updatedBy,
    };
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to save investor alias changes.';
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

  private normalizeDate(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().slice(0, 10);
  }
}
