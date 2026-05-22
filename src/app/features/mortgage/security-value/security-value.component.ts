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
  SecurityValueBulkUpdateRequest,
  SecurityValueRow,
  SecurityValueRowSnapshot,
  SecurityValueUpdatePayload,
} from '../../../core/interfaces/security-value.interfaces';
import { ExcelService } from '../../../core/services/excel.service';
import { PdfService } from '../../../core/services/pdf.service';
import { SecurityValueApiService } from '../../../core/services/security-value-api.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiSecurityValueToRow } from '../../../core/utils/security-value.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  SECURITY_VALUE_COLUMN_FILTER_CONFIG,
  SECURITY_VALUE_COLUMNS,
} from './security-value.columns';

const SECURITY_VALUE_EXPORT_COLUMNS: ExportColumn<SecurityValueRow>[] = [
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  {
    header: 'Collateral Per Yardi',
    value: (row) => formatCurrencyForExport(row.collateralPerYardi),
  },
  {
    header: 'Security Value',
    value: (row) => formatCurrencyForExport(row.securityValue),
  },
  { header: 'Date of DWH Update', value: (row) => formatDwhDateForExport(row.dateDwhUpdate) },
];

const DEFAULT_FUNDING_STATUSES = ['IN_DEFAULT'] as const;

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

function formatCurrencyForExport(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

function buildSecurityValueExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `security-value-${stamp}.${extension}`;
}

@Component({
  selector: 'app-security-value',
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
  templateUrl: './security-value.component.html',
  styleUrl: './security-value.component.scss',
})
export class SecurityValueComponent implements OnInit {
  private readonly securityValueApi = inject(SecurityValueApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = SECURITY_VALUE_COLUMNS;
  readonly columnFilterConfig = SECURITY_VALUE_COLUMN_FILTER_CONFIG;
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

  readonly loanAliasSearch = signal('');
  readonly selectedLoanKeys = signal<string[]>([]);
  readonly selectedFundingStatuses = signal<string[]>([...DEFAULT_FUNDING_STATUSES]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<SecurityValueRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, SecurityValueRowSnapshot>>({});

  readonly selectedLoans = computed(() => {
    const selectedKeys = new Set(this.selectedLoanKeys());
    return this.rows().filter((row) => selectedKeys.has(row.loanKey));
  });

  readonly searchedLoanAliasOptions = computed(() => {
    const keyword = this.loanAliasSearch().trim().toLowerCase();
    if (!keyword) {
      return [];
    }

    const selectedKeys = new Set(this.selectedLoanKeys());
    return this.rows().filter((row) => {
      if (selectedKeys.has(row.loanKey)) {
        return false;
      }
      return row.loanAlias.toLowerCase().includes(keyword);
    });
  });

  readonly toolbarFilteredRows = computed(() => {
    let result = [...this.rows()];

    const selectedKeys = this.selectedLoanKeys();
    if (selectedKeys.length > 0) {
      const selectedKeySet = new Set(selectedKeys);
      result = result.filter((row) => selectedKeySet.has(row.loanKey));
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
      return '0-0 of 0 LOANS';
    }
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safeCurrentPage - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, totalRows);
    return `${start}-${end} of ${totalRows} LOANS`;
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

  readonly rowClassFn = (row: SecurityValueRow) =>
    this.dirtyLoanKeySet().has(row.loanKey) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadSecurityValues();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state);
    this.currentPage.set(1);
  }

  onColumnFiltersChange(state: ColumnFiltersState): void {
    this.columnFilters.set(state);
    this.currentPage.set(1);
  }

  updateLoanAliasSearch(value: string): void {
    this.loanAliasSearch.set(value);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  selectLoan(row: SecurityValueRow): void {
    if (this.selectedLoanKeys().includes(row.loanKey)) {
      return;
    }

    this.selectedLoanKeys.set([...this.selectedLoanKeys(), row.loanKey]);
    this.loanAliasSearch.set('');
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  removeSelectedLoan(loanKey: string): void {
    this.selectedLoanKeys.set(
      this.selectedLoanKeys().filter((selectedKey) => selectedKey !== loanKey),
    );
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateFundingStatuses(values: string[] | null): void {
    this.selectedFundingStatuses.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateSecurityValue(loanKey: string, rawValue: string): void {
    const parsed = this.parseCurrencyInput(rawValue);
    this.rows.update((current) =>
      current.map((row) => {
        if (row.loanKey !== loanKey) {
          return row;
        }
        return {
          ...row,
          securityValue: parsed,
          securityValueOverridden: true,
        };
      }),
    );
    this.errorMessage.set('');
  }

  formatCurrency(value: number | null): string {
    return formatCurrencyForExport(value);
  }

  formatDwhDate(value: string): string {
    return formatDwhDateForExport(value);
  }

  securityValueInputValue(row: SecurityValueRow): string {
    if (row.securityValue === null || !Number.isFinite(row.securityValue)) {
      return '';
    }
    return String(row.securityValue);
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

    const request: SecurityValueBulkUpdateRequest = {
      loans: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.securityValueApi.updateSecurityValuesBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} security value(s) saved and queued for Yardi update.`
          : `${changedRows.length} security value(s) saved successfully.`;
        this.toastService.success(message);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadSecurityValues();
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
      filename: buildSecurityValueExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
      sheetName: 'Security Value',
      title: 'Security Value',
      columns: SECURITY_VALUE_EXPORT_COLUMNS,
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

  private loadSecurityValues(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.securityValueApi.getSecurityValues().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) => mapApiSecurityValueToRow(record, index));
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set(
          'Unable to fetch security values. Verify API availability and CORS.',
        );
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: SecurityValueRow[]): SecurityValueRow[] {
    let result = [...rows];

    for (const filter of this.columnFilters()) {
      const keyword = String(filter.value ?? '')
        .trim()
        .toLowerCase();
      if (!keyword) {
        continue;
      }

      result = result.filter((row) => {
        const value = this.getColumnValue(row, filter.id).toLowerCase();
        return value.includes(keyword);
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

  private getColumnValue(row: SecurityValueRow, columnId: string): string {
    switch (columnId) {
      case 'loanAlias':
        return row.loanAlias;
      case 'collateralPerYardi':
        return formatCurrencyForExport(row.collateralPerYardi);
      case 'securityValue':
        return formatCurrencyForExport(row.securityValue);
      case 'dateDwhUpdate':
        return formatDwhDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, SecurityValueRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        securityValue: row.securityValue,
        securityValueOverridden: row.securityValueOverridden,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: SecurityValueRow): SecurityValueUpdatePayload | null {
    const original = this.originalRowState()[row.loanKey];
    const currentValue = row.securityValue;
    const currentOverridden = row.securityValueOverridden;

    if (!original) {
      if (!currentOverridden) {
        return null;
      }
      return this.buildUpdatePayload(row);
    }

    const valueChanged = currentValue !== original.securityValue;
    const overrideChanged = currentOverridden !== original.securityValueOverridden;

    if (!valueChanged && !overrideChanged) {
      return null;
    }

    return this.buildUpdatePayload(row);
  }

  private buildUpdatePayload(row: SecurityValueRow): SecurityValueUpdatePayload | null {
    const resolvedValue =
      row.securityValue ?? (row.securityValueOverridden ? null : row.collateralPerYardi);
    if (resolvedValue === null || !Number.isFinite(resolvedValue)) {
      return null;
    }

    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      loanKey: row.loanKey,
      securityValue: resolvedValue,
      securityValueOverridden: row.securityValueOverridden,
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

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to save security value changes.';
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
