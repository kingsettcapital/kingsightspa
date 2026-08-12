import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { buildMortgageGridLoadMessage } from '../../core/utils/mortgage-grid-load-message.util';
import {
  normalizeStatusOptions,
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';
import {
  LoanAliasOptionDto,
  LoanAttributeUpdatePayload,
  LoanBulkUpdateRequest,
  LoanDto,
  LoanLookupsDto,
  LoansApiService,
} from '../../core/services/loans-api.service';

type LoanAttributeRow = {
  loanKey: number;
  loanCode: string;
  loanDescription: string;
  loanAliasName: string;
  loanAliasKey: number | null;
  investorName: string;
  investorAliasName: string;
  ranking: number;
  dummyLoanLink: string;
  lateInterestApplicable: boolean;
  lateInterestOffNote: string;
  fundingStatusKey: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = {
  loanAliasKey: number | null;
  ranking: number;
  dummyLoanLink: string;
  lateInterestApplicable: boolean;
  lateInterestOffNote: string;
  fundingStatusKey: string;
};

type LoanAttributeColumnKey =
  | 'loanCode'
  | 'loanDescription'
  | 'loanAliasName'
  | 'investorAliasName'
  | 'ranking'
  | 'dummyLoanLink'
  | 'lateInterestApplicable'
  | 'lateInterestOffNote'
  | 'fundingStatus'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type LoanSelectOption = { value: string; label: string };

type LoanAttributeTableColumn = {
  key: LoanAttributeColumnKey;
  label: string;
  editable?: boolean;
  audit?: boolean;
};

const LOAN_ATTRIBUTE_TABLE_COLUMNS: LoanAttributeTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanDescription', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'investorAliasName', label: 'Investor Alias' },
  { key: 'ranking', label: 'Ranking', editable: true },
  { key: 'dummyLoanLink', label: 'Dummy Loan Link', editable: true },
  { key: 'lateInterestApplicable', label: 'Late Interest Applicable', editable: true },
  { key: 'lateInterestOffNote', label: 'Late Interest Off Note', editable: true },
  { key: 'fundingStatus', label: 'Funding Status', editable: true },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-loans-ranking',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './loans-ranking.component.html',
  styleUrl: './loans-ranking.component.css',
})
export class LoansRankingComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = LOAN_ATTRIBUTE_TABLE_COLUMNS;

  readonly searchText = signal('');
  readonly sortColumn = signal<LoanAttributeColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedLoanCodes = signal<string[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly selectedStatuses = signal<string[]>([]);
  /** Alias names that match the selected Status filter (from LoanSecurityValue). */
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<LoanAttributeRow[]>([]);
  readonly loanAliasOptions = signal<LoanAliasOptionDto[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});
  /** Ignores the empty search emit ng-select fires right after selecting a chip. */
  private suppressEmptySearchClear = false;

  readonly loanSelectOptions = computed<LoanSelectOption[]>(() => {
    const seen = new Set<string>();
    const options: LoanSelectOption[] = [];

    for (const row of this.rows()) {
      if (!row.loanCode || seen.has(row.loanCode)) continue;
      seen.add(row.loanCode);
      options.push({
        value: row.loanCode,
        label: `${row.loanCode} ${row.loanDescription}`.trim(),
      });
    }

    return options.sort((a, b) => a.value.localeCompare(b.value, undefined, { sensitivity: 'base' }));
  });

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  /** Row dropdown: dim_status keys only (exclude filter "(Not set)" sentinel). */
  readonly fundingStatusSelectOptions = computed(() =>
    toStatusSelectOptions(this.statusOptions()).filter(
      (option) => option.value.length > 0 && option.value !== '(null)',
    ),
  );

  ngOnInit(): void {
    this.loadLoans();
  }

  readonly loanCodeOptions = computed(() =>
    [...new Set(this.rows().map((row) => row.loanCode).filter((code) => code.length > 0))].sort(
      (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }),
    ),
  );

  readonly selectedLoans = computed(() => {
    const selectedCodes = new Set(this.selectedLoanCodes());
    return this.rows().filter((row) => selectedCodes.has(row.loanCode));
  });

  readonly searchedLoanOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedCodes = new Set(this.selectedLoanCodes());
    return this.rows().filter((row) => {
      if (selectedCodes.has(row.loanCode)) {
        return false;
      }
      return filterRowsByTableSearch(
        [row],
        keyword,
        this.tableColumns,
        (candidate, key) => this.getCellDisplayValue(candidate, key),
      ).length > 0;
    });
  });

  readonly filteredRows = computed(() => {
    const selectedCodes = this.selectedLoanCodes();
    const keyword = this.searchText();

    let rows = this.rows();

    if (selectedCodes.length > 0) {
      const selectedCodeSet = new Set(selectedCodes);
      rows = rows.filter((row) => selectedCodeSet.has(row.loanCode));
    }

    rows = filterRowsByTableSearch(
      rows,
      keyword,
      this.tableColumns,
      (row, key) => this.getCellDisplayValue(row, key),
    );

    const activeSort = this.sortColumn();
    if (activeSort) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      rows = [...rows].sort(
        (left, right) => this.compareRows(left, right, activeSort) * direction,
      );
    }

    return rows;
  });

  readonly gridLoadMessage = computed(() =>
    buildMortgageGridLoadMessage({
      isLoading: this.isLoading(),
      totalRows: this.rows().length,
      visibleRows: this.filteredRows().length,
      hasClientFilter:
        this.selectedStatuses().length > 0 ||
        this.selectedLoanCodes().length > 0 ||
        this.searchText().trim().length > 0,
      emptyMessage: 'No loans returned.',
    }),
  );

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

  /** Live typeahead → grid filter (keeps last term when ng-select clears search after a chip select). */
  onLoanSearch(event: { term: string } | string | null): void {
    const term = typeof event === 'string' ? event : (event?.term ?? '');
    if (!term.trim() && this.suppressEmptySearchClear) {
      return;
    }
    this.updateSearch(term);
  }

  updateSelectedLoans(values: string[] | null): void {
    this.suppressEmptySearchClear = true;
    this.selectedLoanCodes.set(values ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    queueMicrotask(() => {
      this.suppressEmptySearchClear = false;
    });
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadLoans();
  }

  toggleSort(column: LoanAttributeColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: LoanAttributeColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim() || value === '-') {
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

  getCellDisplayValue(row: LoanAttributeRow, column: LoanAttributeColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'investorAliasName':
        return row.investorAliasName;
      case 'ranking':
        return String(row.ranking);
      case 'dummyLoanLink':
        return row.dummyLoanLink || '—';
      case 'lateInterestApplicable':
        return row.lateInterestApplicable ? 'Yes' : 'No';
      case 'lateInterestOffNote':
        return row.lateInterestOffNote;
      case 'fundingStatus':
        return (
          this.fundingStatusSelectOptions().find((option) => option.value === row.fundingStatusKey)
            ?.label ||
          row.fundingStatusKey ||
          '—'
        );
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  selectLoan(row: LoanAttributeRow): void {
    if (this.selectedLoanCodes().includes(row.loanCode)) {
      return;
    }

    this.selectedLoanCodes.set([...this.selectedLoanCodes(), row.loanCode]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedLoan(loanCode: string): void {
    this.selectedLoanCodes.set(
      this.selectedLoanCodes().filter((code) => code !== loanCode),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  updateRanking(loanCode: string, rawValue: string): void {
    const parsed = Number(rawValue.replace(/,/g, '').trim());
    const ranking = Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
    this.patchRow(loanCode, { ranking });
  }

  updateLoanAlias(loanCode: string, rawValue: number | null): void {
    if (rawValue == null || rawValue <= 0) {
      this.patchRow(loanCode, { loanAliasKey: null, loanAliasName: '—' });
      return;
    }

    const alias = this.loanAliasOptions().find((option) => option.loanAliasId === rawValue);
    this.patchRow(loanCode, {
      loanAliasKey: rawValue,
      loanAliasName: alias?.loanAliasName ?? '—',
    });
  }

  updateDummyLoanLink(loanCode: string, value: string): void {
    this.patchRow(loanCode, { dummyLoanLink: value.trim() });
  }

  updateLateInterestApplicable(loanCode: string, checked: boolean): void {
    this.patchRow(loanCode, { lateInterestApplicable: checked });
  }

  updateLateInterestOffNote(loanCode: string, value: string): void {
    this.patchRow(loanCode, { lateInterestOffNote: value });
  }

  updateFundingStatus(loanCode: string, value: string | null): void {
    this.patchRow(loanCode, { fundingStatusKey: (value ?? '').trim() });
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanCodes.set([]);
    this.selectedStatuses.set([]);
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.loadLoans();
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

    if (!this.rows().length) {
      this.statusMessage.set('No loans loaded to save.');
      return;
    }

    const selectedCodes = this.selectedLoanCodes();
    const keyword = this.searchText().trim();
    const targetRows = this.filteredRows();
    const changedRows = this.rows().filter((row) => this.hasRowChanged(row));

    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const rowsToSave =
      selectedCodes.length > 0 || keyword
        ? changedRows.filter((row) => targetRows.some((target) => target.loanCode === row.loanCode))
        : changedRows;

    if (!rowsToSave.length) {
      this.statusMessage.set('No changes detected in the current selection.');
      this.errorMessage.set('');
      return;
    }

    const missingAlias = rowsToSave.find((row) => !row.loanAliasKey || row.loanAliasKey <= 0);
    if (missingAlias) {
      this.errorMessage.set(
        `Loan ${missingAlias.loanCode} requires a Loan Alias selection before saving.`,
      );
      this.statusMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const request: LoanBulkUpdateRequest = {
      loans: rowsToSave.map((row) => this.buildUpdatePayload(row, userUpdatedBy)),
      auditProfile: 'loan_attribute',
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.loansApi.updateLoanAttributesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const savedCodes = new Set(rowsToSave.map((row) => row.loanCode));

        this.rows.set(
          this.rows().map((row) =>
            savedCodes.has(row.loanCode)
              ? {
                  ...row,
                  ranking: this.normalizeRanking(row.ranking),
                  userUpdatedBy,
                  userUpdatedDate: now,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.statusMessage.set(`${rowsToSave.length} loan(s) updated successfully.`);
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
    this.statusMessage.set('');

    this.securityValueApi.getStatuses().pipe(catchError(() => of([]))).subscribe({
      next: (statuses) => {
        this.statusOptions.set(normalizeStatusOptions(statuses));
        const selectedStatuses = this.selectedStatuses();

        forkJoin({
          loans: this.loansApi.getLoans('loan_attribute', selectedStatuses),
          lookups: this.loansApi.getLookups().pipe(catchError(() => of(null))),
        }).subscribe({
          next: ({ loans, lookups }) => {
            this.applyLoanAliasOptions(lookups);
            const mappedRows = loans
              .map((record, index) => this.mapApiLoanToRow(record, index))
              .filter((row) => row.loanCode.length > 0);

            this.rows.set(mappedRows);
            this.currentPage.set(1);
            this.snapshotOriginalState();
            this.statusMessage.set('');
            this.isLoading.set(false);
          },
          error: () => {
            this.rows.set([]);
            this.statusMessage.set('');
            this.errorMessage.set('Unable to fetch loans. Verify API availability and CORS.');
            this.isLoading.set(false);
          },
        });
      },
      error: () => {
        this.rows.set([]);
        this.statusMessage.set('');
        this.errorMessage.set('Unable to load status options.');
        this.isLoading.set(false);
      },
    });
  }

  private applyLoanAliasOptions(lookups: LoanLookupsDto | null): void {
    const raw =
      lookups?.loanAliases ??
      (lookups as { LoanAliases?: LoanAliasOptionDto[] } | null)?.LoanAliases ??
      [];

    this.loanAliasOptions.set(
      raw
        .map((option) => ({
          loanAliasId: Number(option.loanAliasId ?? (option as { loan_alias_id?: number }).loan_alias_id ?? 0),
          loanAliasName: (option.loanAliasName ?? '').trim(),
        }))
        .filter((option) => option.loanAliasId > 0 && option.loanAliasName.length > 0)
        .sort((left, right) =>
          left.loanAliasName.localeCompare(right.loanAliasName, undefined, { sensitivity: 'base' }),
        ),
    );
  }

  private mapApiLoanToRow(record: LoanDto, index: number): LoanAttributeRow {
    const loanAliasKey =
      record.loanAliasKey != null && Number(record.loanAliasKey) > 0
        ? Number(record.loanAliasKey)
        : null;
    const parsedRanking = Number(record.loanRanking);
    const lateInterestApplicable =
      record.isLoanInterestApplicable != null ? record.isLoanInterestApplicable : true;

    return {
      loanKey: record.loanKey > 0 ? record.loanKey : 0,
      loanCode: record.loanCode?.trim() || `LOAN-${index + 1}`,
      loanDescription: record.loanDesc?.trim() || '—',
      loanAliasName: record.loanAliasName?.trim() || '—',
      loanAliasKey,
      investorName: record.investorName?.trim() || '—',
      investorAliasName: record.investorAliasName?.trim() || '—',
      ranking: Number.isFinite(parsedRanking) && parsedRanking > 0 ? Math.trunc(parsedRanking) : 0,
      dummyLoanLink: record.dummyLoanLink?.trim() ?? '',
      lateInterestApplicable,
      lateInterestOffNote: record.lateInterestOffNote?.trim() ?? '',
      fundingStatusKey:
        record.fundingStatusKey != null && Number.isFinite(Number(record.fundingStatusKey))
          ? String(record.fundingStatusKey)
          : '',
      userUpdatedBy: record.userUpdatedBy?.trim() ?? '',
      userUpdatedDate: record.userUpdatedDate ?? '',
    };
  }

  private buildUpdatePayload(
    row: LoanAttributeRow,
    userUpdatedBy: string,
  ): LoanAttributeUpdatePayload {
    const fundingStatusRaw = row.fundingStatusKey.trim();
    const fundingStatusKey = fundingStatusRaw === '' ? NaN : Number(fundingStatusRaw);
    return {
      loanKey: row.loanKey,
      loanCode: row.loanCode,
      loanAliasKey: row.loanAliasKey ?? 0,
      loanRanking: this.normalizeRanking(row.ranking),
      dummyLoanLink: row.dummyLoanLink,
      isLoanInterestApplicable: row.lateInterestApplicable,
      lateInterestOffNote: row.lateInterestOffNote.trim(),
      fundingStatusKey: Number.isFinite(fundingStatusKey) ? fundingStatusKey : null,
      userUpdatedBy,
    };
  }

  private patchRow(loanCode: string, patch: Partial<LoanAttributeRow>): void {
    this.rows.set(
      this.rows().map((row) => (row.loanCode === loanCode ? { ...row, ...patch } : row)),
    );
    this.clearMessages();
  }

  private revertUnsavedChanges(): void {
    const original = this.originalRowState();
    this.rows.update((rows) =>
      rows.map((row) => {
        const snapshot = original[row.loanCode];
        if (!snapshot) {
          return row;
        }
        return {
          ...row,
          loanAliasKey: snapshot.loanAliasKey,
          loanAliasName: this.resolveLoanAliasName(snapshot.loanAliasKey, row.loanAliasName),
          ranking: snapshot.ranking,
          dummyLoanLink: snapshot.dummyLoanLink,
          lateInterestApplicable: snapshot.lateInterestApplicable,
          lateInterestOffNote: snapshot.lateInterestOffNote,
          fundingStatusKey: snapshot.fundingStatusKey,
        };
      }),
    );
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, RowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanCode] = {
        loanAliasKey: row.loanAliasKey,
        ranking: row.ranking,
        dummyLoanLink: row.dummyLoanLink,
        lateInterestApplicable: row.lateInterestApplicable,
        lateInterestOffNote: row.lateInterestOffNote.trim(),
        fundingStatusKey: row.fundingStatusKey,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private hasRowChanged(row: LoanAttributeRow): boolean {
    const original = this.originalRowState()[row.loanCode];
    if (!original) {
      return true;
    }

    return (
      row.loanAliasKey !== original.loanAliasKey ||
      this.normalizeRanking(row.ranking) !== this.normalizeRanking(original.ranking) ||
      row.dummyLoanLink.trim() !== original.dummyLoanLink.trim() ||
      row.lateInterestApplicable !== original.lateInterestApplicable ||
      row.lateInterestOffNote.trim() !== original.lateInterestOffNote.trim() ||
      row.fundingStatusKey !== original.fundingStatusKey
    );
  }

  private resolveLoanAliasName(loanAliasKey: number | null, fallback: string): string {
    if (!loanAliasKey || loanAliasKey <= 0) {
      return '—';
    }
    const alias = this.loanAliasOptions().find((option) => option.loanAliasId === loanAliasKey);
    return alias?.loanAliasName ?? fallback;
  }

  private normalizeRanking(ranking: number): number {
    const asWholeNumber = Number.isFinite(ranking) ? Math.trunc(ranking) : 0;
    return Math.min(32767, Math.max(0, asWholeNumber));
  }

  private compareRows(
    left: LoanAttributeRow,
    right: LoanAttributeRow,
    column: LoanAttributeColumnKey,
  ): number {
    switch (column) {
      case 'loanCode':
        return left.loanCode.localeCompare(right.loanCode, undefined, { sensitivity: 'base' });
      case 'loanDescription':
        return left.loanDescription.localeCompare(right.loanDescription, undefined, {
          sensitivity: 'base',
        });
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'investorAliasName':
        return left.investorAliasName.localeCompare(right.investorAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'ranking':
        return left.ranking - right.ranking;
      case 'dummyLoanLink':
        return left.dummyLoanLink.localeCompare(right.dummyLoanLink, undefined, {
          sensitivity: 'base',
        });
      case 'lateInterestApplicable':
        return Number(left.lateInterestApplicable) - Number(right.lateInterestApplicable);
      case 'lateInterestOffNote':
        return left.lateInterestOffNote.localeCompare(right.lateInterestOffNote, undefined, {
          sensitivity: 'base',
        });
      case 'fundingStatus':
        return this.getCellDisplayValue(left, 'fundingStatus').localeCompare(
          this.getCellDisplayValue(right, 'fundingStatus'),
          undefined,
          { sensitivity: 'base' },
        );
      case 'userUpdatedBy':
        return left.userUpdatedBy.localeCompare(right.userUpdatedBy, undefined, {
          sensitivity: 'base',
        });
      case 'userUpdatedDate':
        return this.dateSortValue(left.userUpdatedDate) - this.dateSortValue(right.userUpdatedDate);
      default:
        return 0;
    }
  }

  private dateSortValue(value: string): number {
    if (!value?.trim()) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to update loan attribute changes.';
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

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
