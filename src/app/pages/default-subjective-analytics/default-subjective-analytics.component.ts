import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  DEFAULT_STATUS_OPTIONS,
  EXIT_PLAN_OPTIONS,
} from '../../core/constants/default-subjective-analytics-options';
import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
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
};

const SUBJECTIVE_TABLE_COLUMNS: SubjectiveTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'maturityDate', label: 'Maturity Date' },
  { key: 'defaultStatus', label: 'Default Status', editable: 'defaultStatus' },
  { key: 'exitPlan', label: 'Exit Plan', editable: 'exitPlan' },
  { key: 'exitDate', label: 'Exit Date', editable: 'exitDate' },
  { key: 'maturityAdditionalDetail', label: 'Maturity - Additional Detail', editable: 'maturityAdditionalDetail' },
  { key: 'userUpdatedBy', label: 'Modified By' },
  { key: 'userUpdatedDate', label: 'Modified Date' },
];

const DEFAULT_STATUS_LABEL = 'Default';
const NA_OPTION = 'n/a';

const LEGACY_EXIT_PLAN_ALIASES: Record<string, string> = {
  timing: 'Sitting',
  siting: 'Sitting',
};

@Component({
  selector: 'app-default-subjective-analytics',
  standalone: true,
  imports: [CommonModule],
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

  selectAlias(alias: AliasOption): void {
    const name = alias.loanAliasName.trim();
    if (!name || this.selectedAliasNames().includes(name)) {
      return;
    }
    this.selectedAliasNames.set([...this.selectedAliasNames(), name]);
    this.searchText.set('');
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
    this.revertUnsavedChanges();
    this.currentPage.set(1);
    this.clearMessages();
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

  normalizeExitDateField(loanCode: string): void {
    const row = this.rows().find((r) => r.loanCode === loanCode);
    if (!row) {
      return;
    }
    const normalized = this.toExitDateQuarterYear(row.exitDate);
    if (normalized !== row.exitDate) {
      this.patchRow(loanCode, { exitDate: normalized });
    }
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

  formatExitDateDisplay(value: string): string {
    const normalized = this.toExitDateQuarterYear(value);
    return normalized || '—';
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
        return this.formatExitDateDisplay(row.exitDate);
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
        exitDate: this.nullIfEmpty(this.toExitDateQuarterYear(row.exitDate)),
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
        this.statusOptions.set(this.normalizeStatusOptions(statuses));
        this.selectedStatuses.set(this.resolveDefaultStatusValues(this.statusOptions()));
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

    if (!statuses.length) {
      this.rows.set([]);
      this.originalRowState.set({});
      this.statusMessage.set('Select at least one status to load loans.');
      return;
    }

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
      exitDate: this.toExitDateQuarterYear(exitDateRaw),
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

  private toExitDateQuarterYear(value: string): string {
    if (!value?.trim()) {
      return '';
    }

    const trimmed = value.trim();
    if (trimmed.toLowerCase() === NA_OPTION) {
      return NA_OPTION;
    }

    const quarterMatch = trimmed.match(/^Q?\s*([1-4])\s*[\/\-]\s*(\d{4})$/i);
    if (quarterMatch) {
      return `Q${quarterMatch[1]}/${quarterMatch[2]}`;
    }

    const iso = this.toDateInputValue(trimmed);
    if (iso) {
      const [, month, year] = iso.split('-');
      const quarter = Math.floor((Number(month) - 1) / 3) + 1;
      return `Q${quarter}/${year}`;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = Number(slashMatch[1]);
      const year = slashMatch[3];
      const quarter = Math.floor((month - 1) / 3) + 1;
      return `Q${quarter}/${year}`;
    }

    return trimmed;
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
        return this.quarterSortValue(left.exitDate) - this.quarterSortValue(right.exitDate);
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

  private quarterSortValue(value: string): number {
    const normalized = this.toExitDateQuarterYear(value);
    const match = normalized.match(/^Q([1-4])\/(\d{4})$/i);
    if (!match) {
      return 0;
    }
    return Number(match[2]) * 10 + Number(match[1]);
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
