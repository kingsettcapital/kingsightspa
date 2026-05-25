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

import { TAX_YEAR_OPTIONS } from '../../../core/constants/tax-arrears-options';
import { ExportColumn } from '../../../core/interfaces/export.interfaces';
import {
  TaxArrearsAddRecordPayload,
  TaxArrearsBulkUpdateRequest,
  TaxArrearsLoanLookup,
  TaxArrearsRow,
  TaxArrearsRowSnapshot,
  TaxArrearsUpdatePayload,
} from '../../../core/interfaces/tax-arrears.interfaces';
import { ExcelService } from '../../../core/services/excel.service';
import { PdfService } from '../../../core/services/pdf.service';
import { TaxArrearsApiService } from '../../../core/services/tax-arrears-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiTaxArrearsToRow } from '../../../core/utils/tax-arrears.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import { TaxArrearsAddRecordModalComponent } from './tax-arrears-add-record-modal/tax-arrears-add-record-modal.component';
import {
  TAX_ARREARS_COLUMN_FILTER_CONFIG,
  TAX_ARREARS_COLUMNS,
} from './tax-arrears.columns';

const EXPORT_COLUMNS: ExportColumn<TaxArrearsRow>[] = [
  { header: 'Loan ID', value: (row) => row.loanId || '—' },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  { header: 'Tax Memo Date', value: (row) => formatDateForExport(row.taxMemoDate) },
  { header: 'Tax Arrears', value: (row) => formatCurrencyForExport(row.taxArrears) },
  { header: 'Tax Year', value: (row) => row.taxYear },
  { header: 'Notes', value: (row) => row.notes || '—' },
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

function formatCurrencyForExport(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `tax-arrears-${stamp}.${extension}`;
}

@Component({
  selector: 'app-tax-arrears',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectComponent,
    LucideAngularModule,
    DataTableComponent,
    DataTableCellDirective,
    TaxArrearsAddRecordModalComponent,
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
  templateUrl: './tax-arrears.component.html',
  styleUrl: './tax-arrears.component.scss',
})
export class TaxArrearsComponent implements OnInit {
  private readonly taxArrearsApi = inject(TaxArrearsApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = TAX_ARREARS_COLUMNS;
  readonly columnFilterConfig = TAX_ARREARS_COLUMN_FILTER_CONFIG;
  readonly excelExportIcon = Sheet;
  readonly pdfExportIcon = FileType;
  readonly taxYearOptions = TAX_YEAR_OPTIONS;

  readonly statusSelectOptions: { value: string; label: string }[] = [
    { value: 'IN_DEFAULT', label: 'In Default' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SETTLED', label: 'Settled' },
    { value: 'DELINQUENT', label: 'Delinquent' },
    { value: 'FUNDED', label: 'Funded' },
    { value: 'COMMITTED', label: 'Committed' },
  ];

  readonly selectedMainLoanId = signal<string | null>(null);
  readonly selectedFundingStatuses = signal<string[]>([...DEFAULT_FUNDING_STATUSES]);
  readonly isAddModalOpen = signal(false);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<TaxArrearsRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, TaxArrearsRowSnapshot>>({});

  readonly mainLoanSelectOptions = computed(() => {
    const loanIds = new Set<string>();
    for (const row of this.rows()) {
      if (row.loanId && row.loanId !== '-') {
        loanIds.add(row.loanId);
      }
    }
    return [...loanIds]
      .sort((left, right) => left.localeCompare(right))
      .map((loanId) => ({ value: loanId, label: loanId }));
  });

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

  readonly loansByAlias = computed(() => {
    const map: Record<string, TaxArrearsLoanLookup> = {};
    for (const row of this.rows()) {
      if (!row.loanAlias || row.loanAlias === '-' || map[row.loanAlias]) {
        continue;
      }
      map[row.loanAlias] = {
        loanId: row.loanId,
        loanDescription: row.loanDescription,
        loanAlias: row.loanAlias,
        loanKey: row.loanKey,
      };
    }
    return map;
  });

  readonly toolbarFilteredRows = computed(() => {
    let result = [...this.rows()];

    const mainLoanId = this.selectedMainLoanId();
    if (mainLoanId) {
      result = result.filter((row) => row.loanId === mainLoanId);
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

  readonly dirtyRecordKeySet = computed(() => {
    const keys = new Set<string>();
    for (const row of this.rows()) {
      if (this.getChangedFields(row)) {
        keys.add(row.recordKey);
      }
    }
    return keys;
  });

  readonly rowClassFn = (row: TaxArrearsRow) =>
    this.dirtyRecordKeySet().has(row.recordKey) ? 'ks-table__row--dirty' : null;

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

  updateMainLoan(value: string | null): void {
    this.selectedMainLoanId.set(value);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateFundingStatuses(values: string[] | null): void {
    this.selectedFundingStatuses.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  openAddRecordModal(): void {
    this.isAddModalOpen.set(true);
  }

  closeAddRecordModal(): void {
    this.isAddModalOpen.set(false);
  }

  onAddRecordSubmitted(payload: TaxArrearsAddRecordPayload): void {
    this.isSaving.set(true);
    this.taxArrearsApi.addTaxArrearsRecord(payload).subscribe({
      next: () => {
        this.toastService.success('Tax arrears record added successfully.');
        this.isAddModalOpen.set(false);
        this.isSaving.set(false);
        this.loadRows();
      },
      error: (error) => {
        this.toastService.error(this.extractBackendError(error, 'Failed to add tax arrears record.'));
        this.isSaving.set(false);
      },
    });
  }

  updateTaxMemoDate(recordKey: string, rawValue: string): void {
    this.updateRowField(recordKey, 'taxMemoDate', this.parseDateInput(rawValue));
  }

  updateTaxArrears(recordKey: string, rawValue: string): void {
    const parsed = this.parseCurrencyInput(rawValue) ?? 0;
    this.updateRowField(recordKey, 'taxArrears', parsed);
  }

  updateTaxYear(recordKey: string, value: string): void {
    this.updateRowField(recordKey, 'taxYear', value);
  }

  updateNotes(recordKey: string, value: string): void {
    this.updateRowField(recordKey, 'notes', value);
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

  currencyInputValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }
    return String(value);
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
    recordKey: string,
    field: keyof TaxArrearsRowSnapshot | 'taxArrears',
    value: string | number,
  ): void {
    this.rows.update((current) =>
      current.map((row) =>
        row.recordKey === recordKey
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

    const request: TaxArrearsBulkUpdateRequest = {
      records: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.taxArrearsApi.updateTaxArrearsBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} tax arrears row(s) saved and queued for Yardi update.`
          : `${changedRows.length} tax arrears row(s) saved successfully.`;
        this.toastService.success(message);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadRows();
      },
      error: (error) => {
        this.toastService.error(this.extractBackendError(error, 'Failed to save tax arrears changes.'));
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
      sheetName: 'Tax Arrears',
      title: 'Loan Syndicate Details',
      columns: EXPORT_COLUMNS,
      rows: exportRows,
    };

    if (format === 'excel') {
      this.excelService.export(exportOptions);
      this.toastService.success(`Exported ${exportRows.length} record(s) to Excel.`);
    } else {
      this.pdfService.export(exportOptions);
      this.toastService.success(`Exported ${exportRows.length} record(s) to PDF.`);
    }

    this.isExporting.set(false);
  }

  private loadRows(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.taxArrearsApi.getTaxArrears().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) => mapApiTaxArrearsToRow(record, index));
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set('Unable to fetch tax arrears. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: TaxArrearsRow[]): TaxArrearsRow[] {
    let result = [...rows];

    for (const filter of this.columnFilters()) {
      const filterValue = String(filter.value ?? '').trim();
      if (!filterValue) {
        continue;
      }

      const filterType = TAX_ARREARS_COLUMN_FILTER_CONFIG[filter.id]?.type;
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

  private getRowDateIso(row: TaxArrearsRow, columnId: string): string {
    switch (columnId) {
      case 'taxMemoDate':
        return row.taxMemoDate;
      case 'dateDwhUpdate':
        return row.dateDwhUpdate;
      default:
        return '';
    }
  }

  private getColumnValue(row: TaxArrearsRow, columnId: string): string {
    switch (columnId) {
      case 'loanId':
        return row.loanId;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAlias':
        return row.loanAlias;
      case 'taxMemoDate':
        return formatDateForExport(row.taxMemoDate);
      case 'taxArrears':
        return formatCurrencyForExport(row.taxArrears);
      case 'taxYear':
        return row.taxYear;
      case 'notes':
        return row.notes;
      case 'dateDwhUpdate':
        return formatDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, TaxArrearsRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.recordKey] = {
        taxMemoDate: row.taxMemoDate,
        taxArrears: row.taxArrears,
        taxYear: row.taxYear,
        notes: row.notes,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: TaxArrearsRow): TaxArrearsUpdatePayload | null {
    const original = this.originalRowState()[row.recordKey];
    if (!original) {
      return null;
    }

    const changed =
      row.taxMemoDate !== original.taxMemoDate ||
      row.taxArrears !== original.taxArrears ||
      row.taxYear !== original.taxYear ||
      row.notes !== original.notes;

    return changed ? this.buildUpdatePayload(row) : null;
  }

  private buildUpdatePayload(row: TaxArrearsRow): TaxArrearsUpdatePayload {
    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      recordKey: row.recordKey,
      loanKey: row.loanKey,
      taxMemoDate: row.taxMemoDate === '-' ? '' : row.taxMemoDate,
      taxArrears: row.taxArrears,
      taxYear: row.taxYear,
      notes: row.notes,
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

  private parseCurrencyInput(value: string): number | null {
    const normalized = value.replace(/[$,\s]/g, '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractBackendError(error: unknown, fallback: string): string {
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
