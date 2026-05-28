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
  OtherCostBulkUpdateRequest,
  OtherCostRow,
  OtherCostRowSnapshot,
  OtherCostUpdatePayload,
} from '../../../core/interfaces/other-cost.interfaces';
import { ExcelService } from '../../../core/services/excel.service';
import { OtherCostApiService } from '../../../core/services/other-cost-api.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import { mapApiOtherCostToRow } from '../../../core/utils/other-cost.mapper';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  OTHER_COST_COLUMN_FILTER_CONFIG,
  OTHER_COST_COLUMNS,
} from './other-cost.columns';

const OTHER_COST_EXPORT_COLUMNS: ExportColumn<OtherCostRow>[] = [
  { header: 'Loan ID', value: (row) => row.loanId || '—' },
  { header: 'Description', value: (row) => row.loanDescription },
  { header: 'Loan Alias', value: (row) => row.loanAlias },
  {
    header: 'Outstanding Invoices',
    value: (row) => formatCurrencyForExport(row.outstandingInvoices),
  },
  {
    header: 'Est Realization Costs',
    value: (row) => formatCurrencyForExport(row.estRealizationCosts),
  },
  {
    header: 'Cost to Complete',
    value: (row) => formatCurrencyForExport(row.costToComplete),
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

function buildOtherCostExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `other-cost-${stamp}.${extension}`;
}

@Component({
  selector: 'app-other-cost',
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
  templateUrl: './other-cost.component.html',
  styleUrl: './other-cost.component.scss',
})
export class OtherCostComponent implements OnInit {
  private readonly otherCostApi = inject(OtherCostApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = OTHER_COST_COLUMNS;
  readonly columnFilterConfig = OTHER_COST_COLUMN_FILTER_CONFIG;
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

  readonly selectedLoanAlias = signal<string | null>(null);
  readonly selectedFundingStatuses = signal<string[]>([...DEFAULT_FUNDING_STATUSES]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<OtherCostRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<string, OtherCostRowSnapshot>>({});

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

    const loanAlias = this.selectedLoanAlias();
    if (loanAlias) {
      result = result.filter((row) => row.loanAlias === loanAlias);
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

  readonly rowClassFn = (row: OtherCostRow) =>
    this.dirtyLoanKeySet().has(row.loanKey) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadOtherCosts();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state);
    this.currentPage.set(1);
  }

  onColumnFiltersChange(state: ColumnFiltersState): void {
    this.columnFilters.set(state);
    this.currentPage.set(1);
  }

  updateLoanAlias(value: string | null): void {
    this.selectedLoanAlias.set(value);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateFundingStatuses(values: string[] | null): void {
    this.selectedFundingStatuses.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateCostField(
    loanKey: string,
    field: 'outstandingInvoices' | 'estRealizationCosts' | 'costToComplete',
    rawValue: string,
  ): void {
    const parsed = this.parseCurrencyInput(rawValue) ?? 0;
    this.rows.update((current) =>
      current.map((row) =>
        row.loanKey === loanKey
          ? {
              ...row,
              [field]: parsed,
            }
          : row,
      ),
    );
    this.errorMessage.set('');
  }

  currencyInputValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }

  formatDwhDate(value: string): string {
    return formatDwhDateForExport(value);
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

    const request: OtherCostBulkUpdateRequest = {
      loans: changedRows.map((row) => this.buildUpdatePayload(row)!),
      pushToYardi,
    };

    this.otherCostApi.updateOtherCostsBulk(request).subscribe({
      next: () => {
        const message = pushToYardi
          ? `${changedRows.length} other cost row(s) saved and queued for Yardi update.`
          : `${changedRows.length} other cost row(s) saved successfully.`;
        this.toastService.success(message);
        this.errorMessage.set('');
        this.isSaving.set(false);
        this.loadOtherCosts();
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
      filename: buildOtherCostExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
      sheetName: 'Other Cost',
      title: 'Loan Syndicate Details',
      columns: OTHER_COST_EXPORT_COLUMNS,
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

  private loadOtherCosts(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.otherCostApi.getOtherCosts().subscribe({
      next: (records) => {
        const mappedRows = records.map((record, index) => mapApiOtherCostToRow(record, index));
        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set('Unable to fetch other costs. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: OtherCostRow[]): OtherCostRow[] {
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

  private getColumnValue(row: OtherCostRow, columnId: string): string {
    switch (columnId) {
      case 'loanId':
        return row.loanId;
      case 'loanDescription':
        return row.loanDescription;
      case 'loanAlias':
        return row.loanAlias;
      case 'outstandingInvoices':
        return formatCurrencyForExport(row.outstandingInvoices);
      case 'estRealizationCosts':
        return formatCurrencyForExport(row.estRealizationCosts);
      case 'costToComplete':
        return formatCurrencyForExport(row.costToComplete);
      case 'dateDwhUpdate':
        return formatDwhDateForExport(row.dateDwhUpdate);
      default:
        return '';
    }
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, OtherCostRowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.loanKey] = {
        outstandingInvoices: row.outstandingInvoices,
        estRealizationCosts: row.estRealizationCosts,
        costToComplete: row.costToComplete,
      };
    }
    this.originalRowState.set(snapshot);
  }

  private getChangedFields(row: OtherCostRow): OtherCostUpdatePayload | null {
    const original = this.originalRowState()[row.loanKey];
    if (!original) {
      return null;
    }

    const changed =
      row.outstandingInvoices !== original.outstandingInvoices ||
      row.estRealizationCosts !== original.estRealizationCosts ||
      row.costToComplete !== original.costToComplete;

    return changed ? this.buildUpdatePayload(row) : null;
  }

  private buildUpdatePayload(row: OtherCostRow): OtherCostUpdatePayload {
    const updatedBy =
      row.updatedBy && row.updatedBy.trim().length > 0 && row.updatedBy !== '-'
        ? row.updatedBy
        : this.defaultUpdatedBy;

    return {
      loanKey: row.loanKey,
      outstandingInvoices: row.outstandingInvoices,
      estRealizationCosts: row.estRealizationCosts,
      costToComplete: row.costToComplete,
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
    const fallback = 'Failed to save other cost changes.';
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
