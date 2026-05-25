import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgFooterTemplateDirective, NgSelectComponent } from '@ng-select/ng-select';
import { ColumnFiltersState, SortingState } from '@tanstack/angular-table';
import { FileType, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider, Sheet } from 'lucide-angular';
import { forkJoin, map, Observable } from 'rxjs';

import { ExportColumn } from '../../../core/interfaces/export.interfaces';
import {
  LoanRankingRow,
  LoanRankingRowSnapshot,
  LoanTableQuery,
  LoanUpdatePayload,
  UnassignedLoanOption,
} from '../../../core/interfaces/loan-table.interfaces';
import { UserRole } from '../../../core/enums/user-role.enum';
import { AuthService } from '../../../core/services/auth.service';
import { ExcelService } from '../../../core/services/excel.service';
import { rowToApiRecord } from '../../../core/services/loans-table-query.util';
import { LoansApiService } from '../../../core/services/loans-api.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  BOOLEAN_FILTER_OPTIONS,
  COLUMN_FILTER_CONFIG,
  LOAN_RANKING_COLUMNS,
} from './loans-ranking.columns';
import { LoanAliasAssignModalComponent } from './loan-alias-assign-modal/loan-alias-assign-modal.component';
import { LoanAliasCreateModalComponent } from './loan-alias-create-modal/loan-alias-create-modal.component';

const LOAN_RANKING_EXPORT_COLUMNS: ExportColumn<LoanRankingRow>[] = [
  { header: 'Loan ID', value: (row) => row.loanId || '—' },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  { header: 'Investor', value: (row) => row.investorName },
  { header: 'Ranking', value: (row) => row.ranking },
  {
    header: 'Dummy Loan Identifier',
    value: (row) => formatBooleanForExport(row.dummyLoanIdentifier),
  },
  {
    header: 'Late Interest Applicable',
    value: (row) => formatBooleanForExport(row.lateInterestApplicable),
  },
  { header: 'Late Interest Off Note', value: (row) => row.lateInterestOffNote },
  { header: 'Date of DWH Update', value: (row) => formatDwhDateForExport(row.dateDwhUpdate) },
];

function formatBooleanForExport(value: boolean): string {
  return value ? 'TRUE' : 'FALSE';
}

function formatDwhDateForExport(value: string): string {
  if (!value || value === '-') {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
}

function buildLoanRankingExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `loan-ranking-${stamp}.${extension}`;
}

/** Set to true to load and save via local mock data instead of GET /api/Loans. */
const USE_LOANS_RANKING_EXAMPLE_DATA = true;

/** Sentinel value for the "+ Add new" option in the loan alias dropdown. */
export const LOAN_ALIAS_ADD_NEW_VALUE = '__add_new_loan_alias__';

export type LoanAliasSelectOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-loans-ranking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectComponent,
    NgFooterTemplateDirective,
    LucideAngularModule,
    DataTableComponent,
    DataTableCellDirective,
    LoanAliasCreateModalComponent,
    LoanAliasAssignModalComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        Sheet,
        FileType,
      }),
    },
  ],
  templateUrl: './loans-ranking.component.html',
  styleUrl: './loans-ranking.component.scss',
})
export class LoansRankingComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly authService = inject(AuthService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly loansApiOptions = { useExampleData: USE_LOANS_RANKING_EXAMPLE_DATA };

  readonly tableColumns = LOAN_RANKING_COLUMNS;
  readonly columnFilterConfig = COLUMN_FILTER_CONFIG;
  readonly booleanFilterOptions = BOOLEAN_FILTER_OPTIONS;
  readonly excelExportIcon = Sheet;
  readonly pdfExportIcon = FileType;

  readonly isAdministrator = computed(
    () => this.authService.currentUser()?.role === UserRole.Administrator,
  );

  readonly isCreateAliasModalOpen = signal(false);
  readonly isAssignAliasModalOpen = signal(false);
  readonly isAliasFlowLoading = signal(false);
  readonly pendingAliasName = signal('');
  readonly unassignedLoansForAssign = signal<UnassignedLoanOption[]>([]);

  readonly statusSelectOptions: { value: string; label: string }[] = [
    { value: 'ACTIVE_SYNDICATE', label: 'ACTIVE_SYNDICATE' },
    { value: 'SETTLED', label: 'SETTLED' },
    { value: 'DELINQUENT', label: 'DELINQUENT' },
  ];

  readonly searchText = signal('');
  readonly statusFilters = signal<string[]>([]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);
  readonly totalCount = signal(0);
  readonly serverTotalPages = signal<number | null>(null);

  readonly rows = signal<LoanRankingRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, LoanRankingRowSnapshot>>({});

  /** Stable per-row option lists — avoids ng-select reset when [items] gets a new array each CD cycle. */
  readonly loanAliasSelectOptionsByKey = computed(() => {
    const optionsByKey: Record<string, LoanAliasSelectOption[]> = {};
    for (const row of this.rows()) {
      optionsByKey[row.loanKey] = this.buildLoanAliasSelectOptions(row);
    }
    return optionsByKey;
  });

  readonly totalPages = computed(() => {
    const fromServer = this.serverTotalPages();
    if (fromServer && fromServer > 0) {
      return fromServer;
    }
    const totalRows = this.totalCount();
    if (totalRows === 0) {
      return 1;
    }
    return Math.ceil(totalRows / this.pageSize());
  });

  readonly pageRangeLabel = computed(() => {
    const totalRows = this.totalCount();
    if (totalRows === 0) {
      return '0-0 of 0 FACILITIES';
    }
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safeCurrentPage - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, totalRows);
    return `${start}-${end} of ${totalRows} FACILITIES`;
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 1, total - 2));
    const end = Math.min(total, start + 2);
    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadLoans();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state);
    this.currentPage.set(1);
    this.loadLoans();
  }

  onColumnFiltersChange(state: ColumnFiltersState): void {
    this.columnFilters.set(state);
    this.currentPage.set(1);
    this.loadLoans();
  }

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.errorMessage.set('');
    this.loadLoans();
  }

  updateStatusFilters(values: string[] | null): void {
    this.statusFilters.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
    this.loadLoans();
  }

  exportExcel(): void {
    this.runExport('excel');
  }

  exportPdf(): void {
    this.runExport('pdf');
  }

  updateRowField<K extends keyof LoanRankingRow>(
    loanKey: string,
    field: K,
    value: LoanRankingRow[K],
  ): void {
    this.rows.update((current) =>
      current.map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
    this.errorMessage.set('');
  }

  goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
    this.loadLoans();
  }

  goToNextPage(): void {
    const maxPage = this.totalPages();
    this.currentPage.set(Math.min(maxPage, this.currentPage() + 1));
    this.loadLoans();
  }

  goToPage(page: number): void {
    const maxPage = this.totalPages();
    this.currentPage.set(Math.max(1, Math.min(page, maxPage)));
    this.loadLoans();
  }

  formatBoolean(value: boolean): string {
    return formatBooleanForExport(value);
  }

  formatDwhDate(value: string): string {
    return formatDwhDateForExport(value);
  }

  readonly compareLoanAlias = (
    optionValue: string | null | undefined,
    modelValue: string | null | undefined,
  ): boolean => (optionValue ?? '') === (modelValue ?? '');

  readonly trackLoanAliasOption = (value: string): string => value;

  loanAliasSelectOptionsFor(row: LoanRankingRow): LoanAliasSelectOption[] {
    return this.loanAliasSelectOptionsByKey()[row.loanKey] ?? [{ value: '', label: '—' }];
  }

  loanAliasModelValue(row: LoanRankingRow): string {
    const value = row.loanAlias || '';
    return value === LOAN_ALIAS_ADD_NEW_VALUE ? '' : value;
  }

  onLoanAliasSelectChange(row: LoanRankingRow, value: string | LoanAliasSelectOption | null): void {
    const selected =
      typeof value === 'string' ? value : (value as LoanAliasSelectOption | null)?.value ?? '';
    if (!selected || selected === LOAN_ALIAS_ADD_NEW_VALUE) {
      return;
    }
    this.updateRowField(row.loanKey, 'loanAlias', selected);
  }

  onAddNewLoanAliasClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.openCreateLoanAliasModal();
  }

  private buildLoanAliasSelectOptions(row: LoanRankingRow): LoanAliasSelectOption[] {
    const options: LoanAliasSelectOption[] = [{ value: '', label: '—' }];
    for (const alias of row.loanAliasOptions) {
      if (alias && alias !== LOAN_ALIAS_ADD_NEW_VALUE) {
        options.push({ value: alias, label: alias });
      }
    }
    return options;
  }

  private addLoanAliasOptionToAllRows(aliasName: string): void {
    const trimmed = aliasName.trim();
    if (!trimmed) {
      return;
    }
    this.rows.update((current) =>
      current.map((row) => {
        const loanAlias =
          row.loanAlias === LOAN_ALIAS_ADD_NEW_VALUE ? '' : row.loanAlias;
        const loanAliasOptions = [
          ...new Set([
            ...row.loanAliasOptions.filter((option) => option !== LOAN_ALIAS_ADD_NEW_VALUE),
            trimmed,
          ]),
        ];
        return { ...row, loanAlias, loanAliasOptions };
      }),
    );
  }

  openCreateLoanAliasModal(): void {
    this.isCreateAliasModalOpen.set(true);
  }

  closeCreateLoanAliasModal(): void {
    this.isCreateAliasModalOpen.set(false);
  }

  onCreateLoanAliasSubmitted(aliasName: string): void {
    this.isCreateAliasModalOpen.set(false);
    this.pendingAliasName.set(aliasName);
    this.isAssignAliasModalOpen.set(true);
    this.isAliasFlowLoading.set(true);
    this.unassignedLoansForAssign.set([]);

    this.loansApi.createLoanAlias(aliasName, this.loansApiOptions).subscribe({
      next: () => {
        this.addLoanAliasOptionToAllRows(aliasName);
        this.loansApi.getUnassignedLoans(this.loansApiOptions).subscribe({
          next: (loans) => {
            this.unassignedLoansForAssign.set(loans);
            this.isAliasFlowLoading.set(false);
          },
          error: () => {
            this.toastService.error('Unable to load unassigned loans.');
            this.isAssignAliasModalOpen.set(false);
            this.isAliasFlowLoading.set(false);
          },
        });
      },
      error: () => {
        this.toastService.error('Unable to create loan alias.');
        this.isAssignAliasModalOpen.set(false);
        this.isAliasFlowLoading.set(false);
      },
    });
  }

  closeAssignLoanAliasModal(): void {
    this.isAssignAliasModalOpen.set(false);
    this.pendingAliasName.set('');
    this.unassignedLoansForAssign.set([]);
  }

  onAssignLoansSubmitted(loanKeys: string[]): void {
    const aliasName = this.pendingAliasName().trim();
    if (!aliasName || !loanKeys.length) {
      return;
    }

    this.isAliasFlowLoading.set(true);
    this.loansApi
      .assignLoansToAlias({ aliasName, loanKeys }, this.loansApiOptions)
      .subscribe({
        next: () => {
          this.applyAssignedAliasToRows(aliasName, loanKeys);
          this.isAssignAliasModalOpen.set(false);
          this.pendingAliasName.set('');
          this.unassignedLoansForAssign.set([]);
          this.isAliasFlowLoading.set(false);
          this.toastService.success(
            `${loanKeys.length} loan(s) assigned to "${aliasName}". Save to persist changes.`,
          );
        },
        error: () => {
          this.toastService.error('Unable to assign loans to the new alias.');
          this.isAliasFlowLoading.set(false);
        },
      });
  }

  private applyAssignedAliasToRows(aliasName: string, loanKeys: string[]): void {
    const keySet = new Set(loanKeys);
    this.rows.update((current) =>
      current.map((row) => {
        if (!keySet.has(row.loanKey)) {
          return row;
        }
        const options = [
          ...new Set([
            ...row.loanAliasOptions.filter((option) => option !== LOAN_ALIAS_ADD_NEW_VALUE),
            aliasName,
          ]),
        ];
        return {
          ...row,
          loanAlias: aliasName,
          loanAliasOptions: options,
        };
      }),
    );
    this.errorMessage.set('');
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const changedRows = this.rows().filter((row) => this.getChangedFields(row) !== null);
    if (!changedRows.length) {
      this.toastService.info('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const updateRequests = changedRows.map((row) => {
      const payload = rowToApiRecord(row);
      if (row.isNew) {
        return this.loansApi.createLoan(payload, this.loansApiOptions);
      }
      const changes = this.getChangedFields(row);
      return this.loansApi.updateLoan(row.loanKey, { ...payload, ...changes }, this.loansApiOptions);
    });

    forkJoin(updateRequests).subscribe({
      next: () => {
        this.toastService.success(`${changedRows.length} loan(s) saved successfully.`);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadLoans();
      },
      error: (error) => {
        this.toastService.error(this.extractBackendError(error));
        this.errorMessage.set('');
        this.isSaving.set(false);
      },
    });
  }

  private runExport(format: 'excel' | 'pdf'): void {
    if (this.isExporting()) {
      return;
    }

    this.isExporting.set(true);
    this.errorMessage.set('');

    this.fetchExportRows().subscribe({
      next: (exportRows) => {
        if (!exportRows.length) {
          this.toastService.info('No data to export for the current filters.');
          this.isExporting.set(false);
          return;
        }

        const exportOptions = {
          filename: buildLoanRankingExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
          sheetName: 'Loan Ranking',
          title: 'Loan Syndicate Details',
          columns: LOAN_RANKING_EXPORT_COLUMNS,
          rows: exportRows,
        };

        if (format === 'excel') {
          this.excelService.export(exportOptions);
          this.toastService.success(`Exported ${exportRows.length} loan(s) to Excel.`);
        } else {
          this.pdfService.export(exportOptions);
          this.toastService.success(`Exported ${exportRows.length} loan(s) to PDF.`);
        }

        this.isExporting.set(false);
      },
      error: () => {
        this.toastService.error('Unable to export loans. Please try again.');
        this.isExporting.set(false);
      },
    });
  }

  private fetchExportRows(): Observable<LoanRankingRow[]> {
    const query: LoanTableQuery = {
      ...this.buildTableQuery(),
      page: 1,
      pageSize: Math.max(this.totalCount(), 1),
    };

    return this.loansApi
      .getLoansTable(query, this.loansApiOptions)
      .pipe(map((result) => result.rows));
  }

  private loadLoans(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const query = this.buildTableQuery();
    this.loansApi.getLoansTable(query, this.loansApiOptions).subscribe({
      next: (result) => {
        this.rows.set(result.rows);
        this.totalCount.set(result.totalCount);
        this.serverTotalPages.set(result.totalPages ?? null);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.totalCount.set(0);
        this.serverTotalPages.set(null);
        this.errorMessage.set('Unable to fetch loans. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private buildTableQuery(): LoanTableQuery {
    return {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      description: this.searchText().trim() || undefined,
      statuses: this.statusFilters().length ? this.statusFilters() : undefined,
      sorting: this.sorting().map((item) => ({ id: item.id, desc: item.desc ?? false })),
      columnFilters: this.columnFilters().map((item) => ({
        id: item.id,
        value: item.value,
      })),
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, LoanRankingRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        loanAlias: row.loanAlias.trim(),
        ranking: row.ranking,
        lateInterestOffNote: row.lateInterestOffNote.trim(),
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: LoanRankingRow): LoanUpdatePayload | null {
    if (row.isNew) {
      return {
        LoanAliasName: row.loanAlias.trim(),
        LoanRanking: this.normalizeRanking(row.ranking),
        LateInterestOffNote: row.lateInterestOffNote.trim(),
      };
    }

    const original = this.originalRowState()[row.loanKey];
    const normalizedAlias = row.loanAlias.trim();
    const normalizedRanking = this.normalizeRanking(row.ranking);
    const normalizedLateInterestOffNote = row.lateInterestOffNote.trim();
    const updatedBy = row.updatedBy && row.updatedBy !== '-' ? row.updatedBy : '1';
    const updatedDate = new Date().toISOString();

    if (!original) {
      return {
        LoanAliasName: normalizedAlias,
        LoanRanking: normalizedRanking,
        LateInterestOffNote: normalizedLateInterestOffNote,
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
    if (normalizedLateInterestOffNote !== original.lateInterestOffNote) {
      payload.LateInterestOffNote = normalizedLateInterestOffNote;
    }

    if (Object.keys(payload).length > 0) {
      payload.UserUpdatedDate = updatedDate;
      payload.UserUpdatedBy = updatedBy;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private normalizeRanking(ranking: number): number {
    const asWholeNumber = Number.isFinite(ranking) ? Math.trunc(ranking) : 1;
    return Math.min(32767, Math.max(0, asWholeNumber));
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
}
