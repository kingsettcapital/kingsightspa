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
  LtvValidationBulkUpdateRequest,
  LtvValidationRow,
  LtvValidationRowSnapshot,
  LtvValidationUpdatePayload,
  MainLoanSelectOption,
} from '../../../core/interfaces/ltv-validation.interfaces';
import { ExcelService } from '../../../core/services/excel.service';
import { LtvValidationApiService } from '../../../core/services/ltv-validation-api.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiLtvValidationToRow } from '../../../core/utils/ltv-validation.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  LTV_VALIDATION_COLUMN_FILTER_CONFIG,
  LTV_VALIDATION_COLUMNS,
} from './ltv-validation.columns';

const EXPORT_COLUMNS: ExportColumn<LtvValidationRow>[] = [
  { header: 'Parent Loan ID', value: (row) => row.parentLoanId },
  { header: 'Child Loan ID', value: (row) => row.childLoanId },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  { header: 'Investor Alias', value: (row) => row.investorAlias },
  { header: 'Security Value', value: (row) => formatCurrencyForExport(row.securityValue) },
  { header: 'Exposure', value: (row) => formatCurrencyForExport(row.exposure) },
  { header: 'Ranking', value: (row) => String(row.ranking) },
  { header: 'LTV', value: (row) => formatLtvForExport(row.ltv) },
  { header: 'AI Commentary', value: (row) => row.aiCommentary },
  { header: 'Date of DWH Update', value: (row) => formatDateForExport(row.dateDwhUpdate) },
];

const DEFAULT_FUNDING_STATUSES = ['IN_DEFAULT'] as const;
const DEFAULT_SORTING: SortingState = [{ id: 'securityValue', desc: false }];

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

function formatLtvForExport(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value}%`;
}

function buildExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `ltv-validation-${stamp}.${extension}`;
}

function isSecurityValueEmpty(value: number | null): boolean {
  return value === null || !Number.isFinite(value);
}

@Component({
  selector: 'app-ltv-validation',
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
  templateUrl: './ltv-validation.component.html',
  styleUrl: './ltv-validation.component.scss',
})
export class LtvValidationComponent implements OnInit {
  private readonly ltvValidationApi = inject(LtvValidationApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = LTV_VALIDATION_COLUMNS;
  readonly columnFilterConfig = LTV_VALIDATION_COLUMN_FILTER_CONFIG;
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

  readonly selectedMainLoanId = signal<string | null>(null);
  readonly selectedFundingStatuses = signal<string[]>([...DEFAULT_FUNDING_STATUSES]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<LtvValidationRow[]>([]);
  readonly sorting = signal<SortingState>([...DEFAULT_SORTING]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, LtvValidationRowSnapshot>>({});

  readonly mainLoanSelectOptions = computed(() => {
    const options = new Map<string, MainLoanSelectOption>();
    for (const row of this.rows()) {
      if (!row.parentLoanId || row.parentLoanId === '-') {
        continue;
      }
      if (!options.has(row.parentLoanId)) {
        options.set(row.parentLoanId, {
          value: row.parentLoanId,
          label: `${row.parentLoanId} — ${row.loanAlias}`,
          loanAlias: row.loanAlias,
        });
      }
    }
    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label));
  });

  readonly toolbarFilteredRows = computed(() => {
    let result = [...this.rows()];

    const mainLoanId = this.selectedMainLoanId();
    if (mainLoanId) {
      result = result.filter((row) => row.parentLoanId === mainLoanId);
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

  readonly rowClassFn = (row: LtvValidationRow) =>
    this.dirtyRecordKeySet().has(row.recordKey) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadRows();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state.length ? state : [...DEFAULT_SORTING]);
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

  updateSecurityValue(recordKey: string, rawValue: string): void {
    const parsed = this.parseCurrencyInput(rawValue);
    this.updateRowField(recordKey, 'securityValue', parsed);
  }

  updateLtv(recordKey: string, rawValue: string): void {
    const parsed = this.parseLtvInput(rawValue);
    this.updateRowField(recordKey, 'ltv', parsed);
  }

  currencyInputValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }

  ltvInputValue(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return '';
    }
    return `${value}%`;
  }

  formatCurrency(value: number): string {
    return formatCurrencyForExport(value);
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

  confirmChanges(): void {
    this.persistChanges(false);
  }

  saveAndUpdate(): void {
    this.persistChanges(true);
  }

  private updateRowField(
    recordKey: string,
    field: 'securityValue' | 'ltv',
    value: number | null,
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

    const request: LtvValidationBulkUpdateRequest = {
      records: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.ltvValidationApi.updateLtvValidationBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} LTV validation row(s) saved and queued for Yardi update.`
          : `${changedRows.length} LTV validation row(s) confirmed successfully.`;
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
      sheetName: 'LTV Validation',
      title: 'Security Value',
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

    this.ltvValidationApi.getLtvValidationRecords().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) => mapApiLtvValidationToRow(record, index));
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.sorting.set([...DEFAULT_SORTING]);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set(
          'Unable to fetch LTV validation records. Verify API availability and CORS.',
        );
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: LtvValidationRow[]): LtvValidationRow[] {
    let result = [...rows];

    for (const filter of this.columnFilters()) {
      const filterValue = String(filter.value ?? '').trim();
      if (!filterValue) {
        continue;
      }

      const filterType = LTV_VALIDATION_COLUMN_FILTER_CONFIG[filter.id]?.type;
      result = result.filter((row) => {
        if (filterType === 'date') {
          return this.getRowDateIso(row, filter.id) === filterValue;
        }
        const value = this.getColumnValue(row, filter.id).toLowerCase();
        return value.includes(filterValue.toLowerCase());
      });
    }

    const sortState = this.sorting()[0] ?? DEFAULT_SORTING[0];
    const direction = sortState.desc ? -1 : 1;
    result.sort((left, right) => {
      if (sortState.id === 'securityValue') {
        return this.compareSecurityValue(left.securityValue, right.securityValue) * direction;
      }
      const leftValue = this.getColumnValue(left, sortState.id);
      const rightValue = this.getColumnValue(right, sortState.id);
      return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * direction;
    });

    return result;
  }

  private compareSecurityValue(left: number | null, right: number | null): number {
    const leftEmpty = isSecurityValueEmpty(left);
    const rightEmpty = isSecurityValueEmpty(right);
    if (leftEmpty !== rightEmpty) {
      return leftEmpty ? -1 : 1;
    }
    if (leftEmpty && rightEmpty) {
      return 0;
    }
    return (left ?? 0) - (right ?? 0);
  }

  private getRowDateIso(row: LtvValidationRow, columnId: string): string {
    if (columnId === 'dateDwhUpdate') {
      return row.dateDwhUpdate;
    }
    return '';
  }

  private getColumnValue(row: LtvValidationRow, columnId: string): string {
    switch (columnId) {
      case 'parentLoanId':
        return row.parentLoanId;
      case 'childLoanId':
        return row.childLoanId;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAlias':
        return row.loanAlias;
      case 'investorAlias':
        return row.investorAlias;
      case 'securityValue':
        return formatCurrencyForExport(row.securityValue);
      case 'exposure':
        return formatCurrencyForExport(row.exposure);
      case 'ranking':
        return String(row.ranking);
      case 'ltv':
        return formatLtvForExport(row.ltv);
      case 'aiCommentary':
        return row.aiCommentary;
      case 'dateDwhUpdate':
        return formatDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, LtvValidationRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.recordKey] = {
        securityValue: row.securityValue,
        ltv: row.ltv,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: LtvValidationRow): LtvValidationUpdatePayload | null {
    const original = this.originalRowState()[row.recordKey];
    if (!original) {
      return null;
    }

    const changed =
      row.securityValue !== original.securityValue || row.ltv !== original.ltv;

    return changed ? this.buildUpdatePayload(row) : null;
  }

  private buildUpdatePayload(row: LtvValidationRow): LtvValidationUpdatePayload {
    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      recordKey: row.recordKey,
      childLoanId: row.childLoanId,
      securityValue: row.securityValue,
      ltv: row.ltv,
      userUpdatedDate: new Date().toISOString(),
      userUpdatedBy: updatedBy,
    };
  }

  private parseCurrencyInput(value: string): number | null {
    const normalized = value.replace(/[$,\s]/g, '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseLtvInput(value: string): number | null {
    const normalized = value.replace(/%/g, '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to save LTV validation changes.';
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
