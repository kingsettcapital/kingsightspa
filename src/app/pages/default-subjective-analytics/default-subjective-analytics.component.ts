import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  DEFAULT_STATUS_OPTIONS,
  EXIT_PLAN_OPTIONS,
} from '../../core/constants/default-subjective-analytics-options';
import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { buildMortgageGridLoadMessage } from '../../core/utils/mortgage-grid-load-message.util';
import {
  normalizeStatusOptions,
  resolveDefaultStatusValues,
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAlias, LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  DefaultSubjectiveAnalyticsApiService,
  DefaultSubjectiveAnalyticsBulkUpdateRequest,
  DefaultSubjectiveAnalyticsRowDto,
} from '../../core/services/default-subjective-analytics-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type SubjectiveRow = {
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasName: string;
  maturityDate: string;
  defaultStatus: string;
  exitPlan: string;
  exitDate: string;
  maturityAdditionalDetail: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = {
  defaultStatus: string;
  exitPlan: string;
  exitDate: string;
  maturityAdditionalDetail: string;
};

type SubjectiveColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'maturityDate'
  | 'defaultStatus'
  | 'exitPlan'
  | 'exitDate'
  | 'maturityAdditionalDetail'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type SubjectiveTableColumn = {
  key: SubjectiveColumnKey;
  label: string;
  editable?: 'defaultStatus' | 'exitPlan' | 'exitDate' | 'maturityAdditionalDetail';
  audit?: boolean;
  colClass?: string;
};

const SUBJECTIVE_TABLE_COLUMNS: SubjectiveTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code', colClass: 'dsa-col--code' },
  { key: 'loanName', label: 'Loan Name', colClass: 'dsa-col--name' },
  { key: 'loanAliasName', label: 'Loan Alias', colClass: 'dsa-col--alias' },
  { key: 'maturityDate', label: 'Maturity Date', colClass: 'dsa-col--maturity' },
  { key: 'defaultStatus', label: 'Default Status', editable: 'defaultStatus', colClass: 'dsa-col--default-status' },
  { key: 'exitPlan', label: 'Exit Plan', editable: 'exitPlan', colClass: 'dsa-col--exit-plan' },
  { key: 'exitDate', label: 'Exit Date', editable: 'exitDate', colClass: 'dsa-col--exit-date' },
  {
    key: 'maturityAdditionalDetail',
    label: 'Maturity - Additional Detail',
    editable: 'maturityAdditionalDetail',
    colClass: 'dsa-col--maturity-detail',
  },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true, colClass: 'dsa-col--audit-by' },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true, colClass: 'dsa-col--audit-date' },
];
const NA_OPTION = 'n/a';

const LEGACY_EXIT_PLAN_ALIASES: Record<string, string> = {
  timing: 'Sitting',
  siting: 'Sitting',
};

@Component({
  selector: 'app-default-subjective-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './default-subjective-analytics.component.html',
  styleUrl: './default-subjective-analytics.component.css',
})
export class DefaultSubjectiveAnalyticsComponent implements OnInit {
  private readonly subjectiveApi = inject(DefaultSubjectiveAnalyticsApiService);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly defaultPageSize = 10;

  readonly tableColumns = SUBJECTIVE_TABLE_COLUMNS;

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly defaultStatusOptions = signal<string[]>([...DEFAULT_STATUS_OPTIONS]);
  readonly exitPlanOptions = signal<string[]>([...EXIT_PLAN_OPTIONS]);
  readonly searchText = signal('');
  readonly sortColumn = signal<SubjectiveColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly selectedAliasNames = signal<string[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<SubjectiveRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});
  /** Ignores the empty search emit ng-select fires right after selecting a chip. */
  private suppressEmptySearchClear = false;

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  ngOnInit(): void {
    this.loadFilters();
  }

  readonly selectedAliases = computed(() => {
    const names = new Set(this.selectedAliasNames().map((n) => n.toLowerCase()));
    return this.aliasOptions().filter((a) => names.has(a.loanAliasName.toLowerCase()));
  });

  readonly aliasSelectOptions = computed(() =>
    this.aliasOptions().map((alias) => ({
      label: alias.loanAliasName,
      value: alias.loanAliasName,
    })),
  );

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  readonly searchedAliasOptions = computed(() => {
    const keyword = this.searchText().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedNames = new Set(this.selectedAliasNames().map((n) => n.toLowerCase()));
    return this.aliasOptions().filter(
      (a) =>
        !selectedNames.has(a.loanAliasName.toLowerCase()) &&
        a.loanAliasName.toLowerCase().includes(keyword),
    );
  });

  readonly filteredRows = computed(() => {
    const selectedNames = this.selectedAliasNames();
    const keyword = this.searchText();

    let rows = this.rows();

    if (selectedNames.length > 0) {
      const nameSet = new Set(selectedNames.map((n) => n.toLowerCase()));
      rows = rows.filter((row) => nameSet.has(row.loanAliasName.trim().toLowerCase()));
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
      isLoading: this.isLoadingGrid() || this.isLoadingFilters(),
      totalRows: this.rows().length,
      visibleRows: this.filteredRows().length,
      hasClientFilter:
        this.selectedAliasNames().length > 0 || this.searchText().trim().length > 0,
      emptyMessage: 'No loans returned for the selected filters.',
    }),
  );

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

  updateSelectedAliases(names: string[] | null): void {
    this.suppressEmptySearchClear = true;
    this.selectedAliasNames.set(names ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
    queueMicrotask(() => {
      this.suppressEmptySearchClear = false;
    });
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  selectAlias(alias: AliasOption): void {
    const name = alias.loanAliasName.trim();
    if (!name || this.selectedAliasNames().includes(name)) {
      return;
    }
    this.selectedAliasNames.set([...this.selectedAliasNames(), name]);
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedAlias(loanAliasName: string): void {
    this.selectedAliasNames.set(
      this.selectedAliasNames().filter((name) => name !== loanAliasName),
    );
    this.currentPage.set(1);
    this.clearMessages();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedAliasNames.set([]);
    this.selectedStatuses.set(resolveDefaultStatusValues(this.statusOptions()));
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  toggleSort(column: SubjectiveColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: SubjectiveColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
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

  updateDefaultStatus(loanCode: string, value: string): void {
    this.patchRow(loanCode, { defaultStatus: value });
  }

  updateExitPlan(loanCode: string, value: string): void {
    this.patchRow(loanCode, { exitPlan: this.normalizeExitPlan(value) });
  }

  updateExitDate(loanCode: string, value: string): void {
    this.patchRow(loanCode, { exitDate: value.trim() });
  }

  updateMaturityDetail(loanCode: string, value: string): void {
    this.patchRow(loanCode, { maturityAdditionalDetail: value });
  }

  formatDisplayDate(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const iso = this.toDateInputValue(value);
    if (!iso) {
      return value;
    }
    const [y, m, d] = iso.split('-');
    return `${m}/${d}/${y}`;
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return this.formatDisplayDate(value);
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

  getCellDisplayValue(row: SubjectiveRow, column: SubjectiveColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'maturityDate':
        return this.formatDisplayDate(row.maturityDate);
      case 'defaultStatus':
        return row.defaultStatus || '—';
      case 'exitPlan':
        return row.exitPlan || '—';
      case 'exitDate':
        return this.formatDisplayDate(row.exitDate);
      case 'maturityAdditionalDetail':
        return row.maturityAdditionalDetail || '—';
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const changedRows = this.rows().filter((row) => this.hasRowChanged(row));
    if (!changedRows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const request: DefaultSubjectiveAnalyticsBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        loanCode: row.loanCode,
        defaultStatus: this.nullIfEmpty(row.defaultStatus),
        exitPlan: this.nullIfEmpty(this.normalizeExitPlan(row.exitPlan)),
        exitDate: this.nullIfEmpty(row.exitDate),
        maturityAdditionalDetail: this.nullIfEmpty(row.maturityAdditionalDetail),
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('Saving changes...');
    this.errorMessage.set('');

    this.subjectiveApi.saveLoans(request).subscribe({
      next: () => {
        const now = new Date().toISOString();
        const savedCodes = new Set(changedRows.map((row) => row.loanCode));
        this.rows.set(
          this.rows().map((row) =>
            savedCodes.has(row.loanCode)
              ? { ...row, userUpdatedBy, userUpdatedDate: now }
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

  private patchRow(loanCode: string, patch: Partial<SubjectiveRow>): void {
    this.rows.set(
      this.rows().map((row) => (row.loanCode === loanCode ? { ...row, ...patch } : row)),
    );
    this.clearMessages();
  }

  private loadFilters(): void {
    this.isLoadingFilters.set(true);
    this.errorMessage.set('');

    forkJoin({
      aliases: this.loanAliasApi.getAll().pipe(catchError(() => of([]))),
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
      lookups: this.subjectiveApi.getLookups().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ aliases, statuses, lookups }) => {
        this.aliasOptions.set(this.normalizeAliases(aliases));
        const statusOpts = normalizeStatusOptions(statuses);
        this.statusOptions.set(statusOpts);
        // This screen captures defaulted loans — Status defaults to "Default".
        this.selectedStatuses.set(resolveDefaultStatusValues(statusOpts));
        this.applyLookupOptions(lookups);
        this.isLoadingFilters.set(false);
        this.loadGrid();
      },
      error: () => {
        this.isLoadingFilters.set(false);
        this.errorMessage.set('Unable to load filters.');
      },
    });
  }

  private loadGrid(): void {
    const statuses = this.selectedStatuses();

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.subjectiveApi.getLoans(statuses).subscribe({
      next: (records) => {
        const mapped = records.map((r) => this.mapRow(r));
        this.rows.set(mapped);
        this.mergeRowValuesIntoDropdownOptions(mapped);
        this.currentPage.set(1);
        this.snapshotOriginalState();
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

  private mapRow(record: DefaultSubjectiveAnalyticsRowDto): SubjectiveRow {
    const raw = record as DefaultSubjectiveAnalyticsRowDto & Record<string, unknown>;
    const loanCode =
      this.pickField(raw, 'loanId', 'LoanId', 'loanCode', 'LoanCode') || '-';
    const exitDateRaw = this.pickField(
      raw,
      'exitDate',
      'ExitDate',
      'subjectiveExitDate',
      'SubjectiveExitDate',
    );
    return {
      loanKey: this.pickNumber(raw, 'loanKey', 'LoanKey'),
      loanCode,
      loanName: this.pickField(raw, 'description', 'Description') || '—',
      loanAliasName: this.pickField(raw, 'loanAliasName', 'LoanAliasName') || '—',
      maturityDate: this.toDateInputValue(
        this.pickField(raw, 'maturityDate', 'MaturityDate') || null,
      ),
      defaultStatus: this.pickField(
        raw,
        'defaultStatus',
        'DefaultStatus',
        'defaultSubjectiveStatus',
        'DefaultSubjectiveStatus',
      ),
      exitPlan: this.normalizeExitPlan(
        this.pickField(raw, 'exitPlan', 'ExitPlan', 'subjectiveExitPlan', 'SubjectiveExitPlan'),
      ),
      exitDate: this.toDateInputValue(exitDateRaw),
      maturityAdditionalDetail: this.pickField(
        raw,
        'maturityAdditionalDetail',
        'MaturityAdditionalDetail',
      ),
      userUpdatedBy: this.pickField(raw, 'userUpdatedBy', 'UserUpdatedBy') || '',
      userUpdatedDate: this.pickField(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
  }

  private applyLookupOptions(lookups: unknown): void {
    const defaultStatuses = this.extractLookupValues(lookups, 'defaultStatuses', 'defaultStatusOptions');
    const exitPlans = this.extractLookupValues(lookups, 'exitPlans', 'exitPlanOptions');
    if (defaultStatuses.length) {
      this.defaultStatusOptions.set(defaultStatuses);
    }
    if (exitPlans.length) {
      this.exitPlanOptions.set(exitPlans.map((v) => this.normalizeExitPlan(v)));
    }
  }

  private extractLookupValues(
    lookups: unknown,
    arrayKey: string,
    optionsKey: string,
  ): string[] {
    if (!lookups || typeof lookups !== 'object') {
      return [];
    }
    const obj = lookups as Record<string, unknown>;
    const fromArray = obj[arrayKey];
    if (Array.isArray(fromArray)) {
      return fromArray
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter((v) => v.length > 0);
    }
    const fromOptions = obj[optionsKey];
    if (Array.isArray(fromOptions)) {
      return (fromOptions as Record<string, unknown>[])
        .map((row) => String(row['value'] ?? row['displayLabel'] ?? '').trim())
        .filter((v) => v.length > 0);
    }
    return [];
  }

  private mergeRowValuesIntoDropdownOptions(rows: SubjectiveRow[]): void {
    const statusSet = new Set(this.defaultStatusOptions());
    const planSet = new Set(this.exitPlanOptions());
    for (const row of rows) {
      if (row.defaultStatus.trim()) {
        statusSet.add(row.defaultStatus.trim());
      }
      if (row.exitPlan.trim()) {
        planSet.add(this.normalizeExitPlan(row.exitPlan));
      }
    }
    this.defaultStatusOptions.set([...statusSet]);
    this.exitPlanOptions.set([...planSet]);
  }

  private normalizeExitPlan(value: string): string {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return '';
    }
    const alias = LEGACY_EXIT_PLAN_ALIASES[trimmed.toLowerCase()];
    return alias ?? trimmed;
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

  private pickField(record: Record<string, unknown>, ...keys: string[]): string {
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

  private normalizeAliases(aliases: LoanAlias[]): AliasOption[] {
    return aliases
      .map((a) => ({
        loanAliasId: Number(a.loanAliasId ?? a.loanAliasKey ?? 0),
        loanAliasName: a.loanAliasName?.trim() || '',
      }))
      .filter((a) => a.loanAliasId > 0 && a.loanAliasName.length > 0)
      .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName));
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, RowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanCode] = this.rowSnapshot(row);
    }
    this.originalRowState.set(snapshot);
  }

  private revertUnsavedChanges(): void {
    const original = this.originalRowState();
    this.rows.update((rows) =>
      rows.map((row) => {
        const stored = original[row.loanCode];
        return stored ? { ...row, ...stored } : row;
      }),
    );
  }

  private rowSnapshot(row: SubjectiveRow): RowSnapshot {
    return {
      defaultStatus: row.defaultStatus,
      exitPlan: row.exitPlan,
      exitDate: row.exitDate,
      maturityAdditionalDetail: row.maturityAdditionalDetail,
    };
  }

  private hasRowChanged(row: SubjectiveRow): boolean {
    const original = this.originalRowState()[row.loanCode];
    if (!original) {
      return true;
    }
    const current = this.rowSnapshot(row);
    return (
      current.defaultStatus !== original.defaultStatus ||
      current.exitPlan !== original.exitPlan ||
      current.exitDate !== original.exitDate ||
      current.maturityAdditionalDetail !== original.maturityAdditionalDetail
    );
  }

  private nullIfEmpty(value: string): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed || trimmed.toLowerCase() === NA_OPTION) {
      return null;
    }
    return trimmed;
  }

  private compareRows(
    left: SubjectiveRow,
    right: SubjectiveRow,
    column: SubjectiveColumnKey,
  ): number {
    switch (column) {
      case 'loanCode':
        return left.loanCode.localeCompare(right.loanCode, undefined, { sensitivity: 'base' });
      case 'loanName':
        return left.loanName.localeCompare(right.loanName, undefined, { sensitivity: 'base' });
      case 'loanAliasName':
        return left.loanAliasName.localeCompare(right.loanAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'maturityDate':
        return this.dateSortValue(left.maturityDate) - this.dateSortValue(right.maturityDate);
      case 'defaultStatus':
        return left.defaultStatus.localeCompare(right.defaultStatus, undefined, {
          sensitivity: 'base',
        });
      case 'exitPlan':
        return left.exitPlan.localeCompare(right.exitPlan, undefined, { sensitivity: 'base' });
      case 'exitDate':
        return this.dateSortValue(left.exitDate) - this.dateSortValue(right.exitDate);
      case 'maturityAdditionalDetail':
        return left.maturityAdditionalDetail.localeCompare(right.maturityAdditionalDetail, undefined, {
          sensitivity: 'base',
        });
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
    const fallback = 'Failed to load or save default subjective analytics data.';
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
