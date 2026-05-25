import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ColumnFiltersState, SortingState } from '@tanstack/angular-table';
import {
  FileType,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  Sheet,
} from 'lucide-angular';

import {
  DEFAULT_STATUS_OPTIONS,
  EXIT_PLAN_OPTIONS,
} from '../../../core/constants/default-subjective-analytics-options';
import { ExportColumn } from '../../../core/interfaces/export.interfaces';
import {
  DefaultSubjectiveAnalyticsBulkUpdateRequest,
  DefaultSubjectiveAnalyticsRow,
  DefaultSubjectiveAnalyticsRowSnapshot,
  DefaultSubjectiveAnalyticsUpdatePayload,
} from '../../../core/interfaces/default-subjective-analytics.interfaces';
import { DefaultSubjectiveAnalyticsApiService } from '../../../core/services/default-subjective-analytics-api.service';
import { ExcelService } from '../../../core/services/excel.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiDefaultSubjectiveAnalyticsToRow } from '../../../core/utils/default-subjective-analytics.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  DEFAULT_SUBJECTIVE_ANALYTICS_COLUMN_FILTER_CONFIG,
  DEFAULT_SUBJECTIVE_ANALYTICS_COLUMNS,
} from './default-subjective-analytics.columns';

const EXPORT_COLUMNS: ExportColumn<DefaultSubjectiveAnalyticsRow>[] = [
  { header: 'Loan ID', value: (row) => row.loanId || '—' },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  { header: 'Maturity Date', value: (row) => formatDateForExport(row.maturityDate) },
  { header: 'Default Status', value: (row) => row.defaultStatus },
  { header: 'Exit Plan', value: (row) => row.exitPlan },
  { header: 'Exit Date', value: (row) => formatDateForExport(row.exitDate) },
  {
    header: 'Maturity - Additional Detail',
    value: (row) => row.maturityAdditionalDetail || '—',
  },
  { header: 'Date of DWH Update', value: (row) => formatDateForExport(row.dateDwhUpdate) },
];

const DEFAULT_FUNDING_STATUSES = ['IN_DEFAULT'] as const;

function formatDateForExport(value: string): string {
  if (!value || value === '-') {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
}

function buildExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `default-subjective-analytics-${stamp}.${extension}`;
}

@Component({
  selector: 'app-default-subjective-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectComponent,
    LucideAngularModule,
    DataTableComponent,
    DataTableCellDirective,
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
  templateUrl: './default-subjective-analytics.component.html',
  styleUrl: './default-subjective-analytics.component.scss',
})
export class DefaultSubjectiveAnalyticsComponent implements OnInit {
  private readonly analyticsApi = inject(DefaultSubjectiveAnalyticsApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = DEFAULT_SUBJECTIVE_ANALYTICS_COLUMNS;
  readonly columnFilterConfig = DEFAULT_SUBJECTIVE_ANALYTICS_COLUMN_FILTER_CONFIG;
  readonly excelExportIcon = Sheet;
  readonly pdfExportIcon = FileType;
  readonly defaultStatusOptions = [...DEFAULT_STATUS_OPTIONS];
  readonly exitPlanOptions = [...EXIT_PLAN_OPTIONS];

  readonly statusSelectOptions: { value: string; label: string }[] = [
    { value: 'IN_DEFAULT', label: 'In Default' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SETTLED', label: 'Settled' },
    { value: 'DELINQUENT', label: 'Delinquent' },
    { value: 'FUNDED', label: 'Funded' },
    { value: 'COMMITTED', label: 'Committed' },
  ];

  readonly selectedLoanAliases = signal<string[]>([]);
  readonly selectedFundingStatuses = signal<string[]>([...DEFAULT_FUNDING_STATUSES]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<DefaultSubjectiveAnalyticsRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, DefaultSubjectiveAnalyticsRowSnapshot>>({});

  readonly loanAliasSelectOptions = computed(() => {
    const aliases = new Set<string>();
    for (const row of this.rows()) {
      if (row.loanAlias && row.loanAlias !== '-') {
        aliases.add(row.loanAlias);
      }
    }
    return [...aliases]
      .sort((left, right) => left.localeCompare(right))
      .map((alias) => ({ value: alias, label: alias }));
  });

  readonly toolbarFilteredRows = computed(() => {
    let result = [...this.rows()];

    const loanAliases = this.selectedLoanAliases();
    if (loanAliases.length > 0) {
      const aliasSet = new Set(loanAliases);
      result = result.filter((row) => aliasSet.has(row.loanAlias));
    }

    const statuses = this.selectedFundingStatuses();
    if (statuses.length > 0) {
      const statusSet = new Set(statuses.map((status) => status.toUpperCase()));
      result = result.filter((row) => statusSet.has(row.fundingStatus.toUpperCase()));
    }

    return result;
  });

  readonly tableFilteredRows = computed(() =>
    this.applyTableFiltersAndSort(this.toolbarFilteredRows()),
  );

  readonly totalFilteredRows = computed(() => this.tableFilteredRows().length);

  readonly totalPages = computed(() => {
    const totalRows = this.totalFilteredRows();
    if (totalRows === 0) {
      return 1;
    }
    return Math.ceil(totalRows / this.pageSize());
  });

  readonly tableRows = computed(() => {
    const rows = this.tableFilteredRows();
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safeCurrentPage - 1) * this.pageSize();
    return rows.slice(start, start + this.pageSize());
  });

  readonly pageRangeLabel = computed(() => {
    const totalRows = this.totalFilteredRows();
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

  readonly hasPendingChanges = computed(() =>
    this.rows().some((row) => this.getChangedFields(row) !== null),
  );

  readonly dirtyLoanKeySet = computed(() => {
    const keys = new Set<string>();
    for (const row of this.rows()) {
      if (this.getChangedFields(row)) {
        keys.add(row.loanKey);
      }
    }
    return keys;
  });

  readonly rowClassFn = (row: DefaultSubjectiveAnalyticsRow) =>
    this.dirtyLoanKeySet().has(row.loanKey) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadRows();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state);
    this.currentPage.set(1);
  }

  onColumnFiltersChange(state: ColumnFiltersState): void {
    this.columnFilters.set(state);
    this.currentPage.set(1);
  }

  updateLoanAliases(values: string[] | null): void {
    this.selectedLoanAliases.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateFundingStatuses(values: string[] | null): void {
    this.selectedFundingStatuses.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateDefaultStatus(loanKey: string, value: string): void {
    this.updateRowField(loanKey, 'defaultStatus', value);
  }

  updateExitPlan(loanKey: string, value: string): void {
    this.updateRowField(loanKey, 'exitPlan', value);
  }

  updateExitDate(loanKey: string, rawValue: string): void {
    this.updateRowField(loanKey, 'exitDate', this.parseDateInput(rawValue));
  }

  updateMaturityAdditionalDetail(loanKey: string, value: string): void {
    this.updateRowField(loanKey, 'maturityAdditionalDetail', value);
  }

  dateInputValue(value: string): string {
    if (!value || value === '-') {
      return '';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().slice(0, 10);
  }

  formatDisplayDate(value: string): string {
    return formatDateForExport(value);
  }

  goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
  }

  goToNextPage(): void {
    this.currentPage.set(Math.min(this.totalPages(), this.currentPage() + 1));
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  exportExcel(): void {
    this.runExport('excel');
  }

  exportPdf(): void {
    this.runExport('pdf');
  }

  saveChanges(): void {
    this.persistChanges(false);
  }

  saveAndUpdate(): void {
    this.persistChanges(true);
  }

  private updateRowField(
    loanKey: string,
    field: 'defaultStatus' | 'exitPlan' | 'exitDate' | 'maturityAdditionalDetail',
    value: string,
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

  private persistChanges(pushToYardi: boolean): void {
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

    const request: DefaultSubjectiveAnalyticsBulkUpdateRequest = {
      loans: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.analyticsApi.updateDefaultSubjectiveAnalyticsBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} subjective analytics row(s) saved and queued for Yardi update.`
          : `${changedRows.length} subjective analytics row(s) saved successfully.`;
        this.toastService.success(message);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadRows();
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

    const exportRows = this.tableFilteredRows();
    if (!exportRows.length) {
      this.toastService.info('No data to export for the current filters.');
      return;
    }

    this.isExporting.set(true);

    const exportOptions = {
      filename: buildExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
      sheetName: 'Default Subjective Analytics',
      title: 'Loan Syndicate Details',
      columns: EXPORT_COLUMNS,
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
  }

  private loadRows(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.analyticsApi.getDefaultSubjectiveAnalytics().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) =>
          mapApiDefaultSubjectiveAnalyticsToRow(record, index),
        );
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set(
          'Unable to fetch subjective analytics. Verify API availability and CORS.',
        );
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(
    rows: DefaultSubjectiveAnalyticsRow[],
  ): DefaultSubjectiveAnalyticsRow[] {
    let result = [...rows];

    for (const filter of this.columnFilters()) {
      const filterValue = String(filter.value ?? '').trim();
      if (!filterValue) {
        continue;
      }

      const filterType = DEFAULT_SUBJECTIVE_ANALYTICS_COLUMN_FILTER_CONFIG[filter.id]?.type;
      result = result.filter((row) => {
        if (filterType === 'date') {
          return this.getRowDateIso(row, filter.id) === filterValue;
        }
        const value = this.getColumnValue(row, filter.id).toLowerCase();
        return value.includes(filterValue.toLowerCase());
      });
    }

    const sortState = this.sorting()[0];
    if (sortState) {
      const direction = sortState.desc ? -1 : 1;
      result.sort((left, right) => {
        const leftValue = this.getColumnValue(left, sortState.id);
        const rightValue = this.getColumnValue(right, sortState.id);
        return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
      });
    }

    return result;
  }

  private getRowDateIso(row: DefaultSubjectiveAnalyticsRow, columnId: string): string {
    switch (columnId) {
      case 'maturityDate':
        return row.maturityDate;
      case 'exitDate':
        return row.exitDate;
      case 'dateDwhUpdate':
        return row.dateDwhUpdate;
      default:
        return '';
    }
  }

  private getColumnValue(row: DefaultSubjectiveAnalyticsRow, columnId: string): string {
    switch (columnId) {
      case 'loanId':
        return row.loanId;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAlias':
        return row.loanAlias;
      case 'maturityDate':
        return formatDateForExport(row.maturityDate);
      case 'defaultStatus':
        return row.defaultStatus;
      case 'exitPlan':
        return row.exitPlan;
      case 'exitDate':
        return formatDateForExport(row.exitDate);
      case 'maturityAdditionalDetail':
        return row.maturityAdditionalDetail;
      case 'dateDwhUpdate':
        return formatDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, DefaultSubjectiveAnalyticsRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        defaultStatus: row.defaultStatus,
        exitPlan: row.exitPlan,
        exitDate: row.exitDate,
        maturityAdditionalDetail: row.maturityAdditionalDetail,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(
    row: DefaultSubjectiveAnalyticsRow,
  ): DefaultSubjectiveAnalyticsUpdatePayload | null {
    const original = this.originalRowState()[row.loanKey];
    if (!original) {
      return null;
    }

    const changed =
      row.defaultStatus !== original.defaultStatus ||
      row.exitPlan !== original.exitPlan ||
      row.exitDate !== original.exitDate ||
      row.maturityAdditionalDetail !== original.maturityAdditionalDetail;

    return changed ? this.buildUpdatePayload(row) : null;
  }

  private buildUpdatePayload(
    row: DefaultSubjectiveAnalyticsRow,
  ): DefaultSubjectiveAnalyticsUpdatePayload {
    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      loanKey: row.loanKey,
      defaultStatus: row.defaultStatus,
      exitPlan: row.exitPlan,
      exitDate: row.exitDate === '-' ? '' : row.exitDate,
      maturityAdditionalDetail: row.maturityAdditionalDetail,
      userUpdatedDate: new Date().toISOString(),
      userUpdatedBy: updatedBy,
    };
  }

  private parseDateInput(value: string): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }
    return parsed.toISOString().slice(0, 10);
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to save subjective analytics changes.';
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
