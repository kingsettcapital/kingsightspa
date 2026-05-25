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

import { ExportColumn } from '../../../core/interfaces/export.interfaces';
import {
  DefaultDateBulkUpdateRequest,
  DefaultDateRow,
  DefaultDateRowSnapshot,
  DefaultDateUpdatePayload,
} from '../../../core/interfaces/default-date.interfaces';
import { DefaultDateApiService } from '../../../core/services/default-date-api.service';
import { ExcelService } from '../../../core/services/excel.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiDefaultDateToRow } from '../../../core/utils/default-date.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  DEFAULT_DATE_COLUMN_FILTER_CONFIG,
  DEFAULT_DATE_COLUMNS,
} from './default-date.columns';

const DEFAULT_DATE_EXPORT_COLUMNS: ExportColumn<DefaultDateRow>[] = [
  { header: 'Loan ID', value: (row) => row.loanId || '—' },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  {
    header: 'Loan Term Default Date',
    value: (row) => formatDateForExport(row.loanTermDefaultDate),
  },
  { header: 'Default Date', value: (row) => formatDateForExport(row.defaultDate) },
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

function buildDefaultDateExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `default-date-${stamp}.${extension}`;
}

@Component({
  selector: 'app-default-date',
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
  templateUrl: './default-date.component.html',
  styleUrl: './default-date.component.scss',
})
export class DefaultDateComponent implements OnInit {
  private readonly defaultDateApi = inject(DefaultDateApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = DEFAULT_DATE_COLUMNS;
  readonly columnFilterConfig = DEFAULT_DATE_COLUMN_FILTER_CONFIG;
  readonly excelExportIcon = Sheet;
  readonly pdfExportIcon = FileType;

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

  readonly rows = signal<DefaultDateRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, DefaultDateRowSnapshot>>({});

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

  readonly rowClassFn = (row: DefaultDateRow) =>
    this.dirtyLoanKeySet().has(row.loanKey) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadDefaultDates();
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

  updateDefaultDate(loanKey: string, rawValue: string): void {
    const parsed = this.parseDateInput(rawValue);
    this.rows.update((current) =>
      current.map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              defaultDate: parsed,
            }
          : row,
      ),
    );
    this.errorMessage.set('');
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

    const request: DefaultDateBulkUpdateRequest = {
      loans: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.defaultDateApi.updateDefaultDatesBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} default date row(s) saved and queued for Yardi update.`
          : `${changedRows.length} default date row(s) saved successfully.`;
        this.toastService.success(message);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadDefaultDates();
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
      filename: buildDefaultDateExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
      sheetName: 'Default Date',
      title: 'Loan Syndicate Details',
      columns: DEFAULT_DATE_EXPORT_COLUMNS,
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

  private loadDefaultDates(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.defaultDateApi.getDefaultDates().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) => mapApiDefaultDateToRow(record, index));
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set('Unable to fetch default dates. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: DefaultDateRow[]): DefaultDateRow[] {
    let result = [...rows];

    for (const filter of this.columnFilters()) {
      const filterValue = String(filter.value ?? '').trim();
      if (!filterValue) {
        continue;
      }

      const filterType = DEFAULT_DATE_COLUMN_FILTER_CONFIG[filter.id]?.type;
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

  private getRowDateIso(row: DefaultDateRow, columnId: string): string {
    switch (columnId) {
      case 'loanTermDefaultDate':
        return row.loanTermDefaultDate;
      case 'defaultDate':
        return row.defaultDate;
      case 'dateDwhUpdate':
        return row.dateDwhUpdate;
      default:
        return '';
    }
  }

  private getColumnValue(row: DefaultDateRow, columnId: string): string {
    switch (columnId) {
      case 'loanId':
        return row.loanId;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAlias':
        return row.loanAlias;
      case 'loanTermDefaultDate':
        return formatDateForExport(row.loanTermDefaultDate);
      case 'defaultDate':
        return formatDateForExport(row.defaultDate);
      case 'dateDwhUpdate':
        return formatDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, DefaultDateRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        defaultDate: row.defaultDate,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: DefaultDateRow): DefaultDateUpdatePayload | null {
    const original = this.originalRowState()[row.loanKey];
    if (!original) {
      return null;
    }

    const changed = row.defaultDate !== original.defaultDate;
    return changed ? this.buildUpdatePayload(row) : null;
  }

  private buildUpdatePayload(row: DefaultDateRow): DefaultDateUpdatePayload {
    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      loanKey: row.loanKey,
      defaultDate: row.defaultDate === '-' ? '' : row.defaultDate,
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
    const fallback = 'Failed to save default date changes.';
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
