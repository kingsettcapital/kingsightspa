import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAliasApiService } from '../../core/services/loan-alias-api.service';
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
  loanId: string;
  description: string;
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

const DEFAULT_STATUS_LABEL = 'Default';
const NA_OPTION = 'n/a';

const FALLBACK_DEFAULT_STATUSES = [
  'Executing Plan',
  'Formulating Plan',
  'Waiting on Market',
  NA_OPTION,
];

/** Matches GET /api/DefaultSubjectiveAnalytics/lookups (mockup "Siting" → API "Timing"). */
const FALLBACK_EXIT_PLANS = [
  'Timing',
  'Constructing',
  'Pre-Development',
  'Selling',
  'Under Sale Contract',
  NA_OPTION,
];

const LEGACY_EXIT_PLAN_ALIASES: Record<string, string> = {
  siting: 'Timing',
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

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  readonly defaultStatusOptions = signal<string[]>(FALLBACK_DEFAULT_STATUSES);
  readonly exitPlanOptions = signal<string[]>(FALLBACK_EXIT_PLANS);
  readonly searchText = signal('');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  readonly selectedStatuses = signal<string[]>([]);

  readonly rows = signal<SubjectiveRow[]>([]);
  readonly originalRowState = signal<Record<number, RowSnapshot>>({});

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

  updateDefaultStatus(loanKey: number, value: string): void {
    this.patchRow(loanKey, { defaultStatus: value });
  }

  updateExitPlan(loanKey: number, value: string): void {
    this.patchRow(loanKey, { exitPlan: this.normalizeExitPlan(value) });
  }

  updateExitDate(loanKey: number, value: string): void {
    this.patchRow(loanKey, { exitDate: value.trim() });
  }

  updateMaturityDetail(loanKey: number, value: string): void {
    this.patchRow(loanKey, { maturityAdditionalDetail: value });
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

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const request: DefaultSubjectiveAnalyticsBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        defaultStatus: this.nullIfEmpty(row.defaultStatus),
        exitPlan: this.nullIfEmpty(this.normalizeExitPlan(row.exitPlan)),
        exitDate: this.nullIfEmpty(row.exitDate),
        maturityAdditionalDetail: this.nullIfEmpty(row.maturityAdditionalDetail),
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    this.subjectiveApi.saveLoans(request).subscribe({
      next: () => {
        this.snapshotOriginalState();
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

  private patchRow(loanKey: number, patch: Partial<SubjectiveRow>): void {
    this.rows.set(
      this.rows().map((row) => (row.loanKey === loanKey ? { ...row, ...patch } : row)),
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
        this.applyLookupOptions(lookups);
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
      this.originalRowState.set({});
      this.statusMessage.set('No loan aliases available to load.');
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

    this.subjectiveApi.getLoans(loanAliasIds, statuses).subscribe({
      next: (response) => {
        const records = this.normalizeRecords(response);
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

  private normalizeRecords(response: unknown): DefaultSubjectiveAnalyticsRowDto[] {
    if (Array.isArray(response)) {
      return response as DefaultSubjectiveAnalyticsRowDto[];
    }
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      for (const key of ['loans', 'data', 'results', 'items', 'value']) {
        const candidate = obj[key];
        if (Array.isArray(candidate)) {
          return candidate as DefaultSubjectiveAnalyticsRowDto[];
        }
      }
    }
    return [];
  }

  private mapRow(record: DefaultSubjectiveAnalyticsRowDto): SubjectiveRow {
    const raw = record as DefaultSubjectiveAnalyticsRowDto & Record<string, unknown>;
    return {
      loanKey: this.pickNumber(raw, 'loanKey', 'LoanKey'),
      loanId: this.pickField(raw, 'loanId', 'LoanId') || '-',
      description: this.pickField(raw, 'description', 'Description') || '-',
      loanAliasName: this.pickField(raw, 'loanAliasName', 'LoanAliasName') || '-',
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
      exitDate: this.toDateInputValue(
        this.pickField(raw, 'exitDate', 'ExitDate', 'subjectiveExitDate', 'SubjectiveExitDate') ||
          null,
      ),
      maturityAdditionalDetail: this.pickField(
        raw,
        'maturityAdditionalDetail',
        'MaturityAdditionalDetail',
      ),
      userUpdatedBy: this.pickField(raw, 'userUpdatedBy', 'UserUpdatedBy') || '-',
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

  private snapshotOriginalState(): void {
    const snapshot: Record<number, RowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = this.rowSnapshot(row);
    }
    this.originalRowState.set(snapshot);
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
    const original = this.originalRowState()[row.loanKey];
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
