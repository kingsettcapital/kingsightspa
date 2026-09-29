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
  InvestorAliasBulkUpdateRequest,
  InvestorAliasRow,
  InvestorAliasUpdatePayload,
} from '../../../core/interfaces/investor.interfaces';
import { ExcelService } from '../../../core/services/excel.service';
import { InvestorApiService } from '../../../core/services/investor-api.service';
import { PdfService } from '../../../core/services/pdf.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  DataTableCellDirective,
  DataTableComponent,
} from '../../../shared/components/data-table';
import {
  INVESTOR_ALIAS_COLUMN_FILTER_CONFIG,
  INVESTOR_ALIAS_COLUMNS,
} from './investor-alias.columns';

const INVESTOR_ALIAS_EXPORT_COLUMNS: ExportColumn<InvestorAliasRow>[] = [
  { header: 'Investor Code', value: (row) => row.investor_code },
  { header: 'Investor', value: (row) => row.investor_name },
  { header: 'Investor Alias', value: (row) => row.investor_alias_name },
  { header: 'Date of DWH Update', value: (row) => formatDwhDateForExport(row.user_updated_date) },
];

function formatDwhDateForExport(value: string | null): string {
  if (!value || value === '-') {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
}

function buildInvestorAliasExportFilename(extension: 'xlsx' | 'pdf'): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `investor-alias-${stamp}.${extension}`;
}

@Component({
  selector: 'app-investor-alias',
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
  templateUrl: './investor-alias.component.html',
  styleUrl: './investor-alias.component.scss',
})
export class InvestorAliasComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);
  private readonly excelService = inject(ExcelService);
  private readonly pdfService = inject(PdfService);
  private readonly toastService = inject(ToastService);
  private readonly defaultPageSize = 20;
  private readonly defaultUpdatedBy = 'system';

  readonly tableColumns = INVESTOR_ALIAS_COLUMNS;
  readonly columnFilterConfig = INVESTOR_ALIAS_COLUMN_FILTER_CONFIG;
  readonly excelExportIcon = Sheet;
  readonly pdfExportIcon = FileType;

  readonly selectedInvestorKeys = signal<number[]>([]);
  readonly errorMessage = signal('');
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isExporting = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);

  readonly rows = signal<InvestorAliasRow[]>([]);
  readonly sorting = signal<SortingState>([]);
  readonly columnFilters = signal<ColumnFiltersState>([]);
  readonly originalRowState = signal<Record<number, { investor_alias_name: string }>>({});

  readonly investorSelectOptions = computed(() =>
    [...this.rows()]
      .map((row) => ({
        value: row.investor_key,
        label: `${row.investor_code} ${row.investor_name}`,
      }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  );

  readonly investorFilteredRows = computed(() => {
    const selectedKeys = this.selectedInvestorKeys();
    if (selectedKeys.length === 0) {
      return this.rows();
    }

    const selectedKeySet = new Set(selectedKeys);
    return this.rows().filter((row) => selectedKeySet.has(row.investor_key));
  });

  readonly tableFilteredRows = computed(() =>
    this.applyTableFiltersAndSort(this.investorFilteredRows()),
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
      return '0-0 of 0 INVESTORS';
    }
    const maxPage = this.totalPages();
    const safeCurrentPage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safeCurrentPage - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, totalRows);
    return `${start}-${end} of ${totalRows} INVESTORS`;
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

  readonly hasPendingAliasChanges = computed(() =>
    this.rows().some((row) => this.isAliasChanged(row)),
  );

  readonly dirtyInvestorKeySet = computed(() => {
    const keys = new Set<number>();
    for (const row of this.rows()) {
      if (this.isAliasChanged(row)) {
        keys.add(row.investor_key);
      }
    }
    return keys;
  });

  readonly rowClassFn = (row: InvestorAliasRow) =>
    this.dirtyInvestorKeySet().has(row.investor_key) ? 'ks-table__row--dirty' : null;

  ngOnInit(): void {
    this.loadInvestors();
  }

  onSortingChange(state: SortingState): void {
    this.sorting.set(state);
    this.currentPage.set(1);
  }

  onColumnFiltersChange(state: ColumnFiltersState): void {
    this.columnFilters.set(state);
    this.currentPage.set(1);
  }

  updateSelectedInvestors(values: number[] | null): void {
    this.selectedInvestorKeys.set(values ?? []);
    this.currentPage.set(1);
    this.errorMessage.set('');
  }

  updateInvestorAlias(investorKey: number, value: string): void {
    this.rows.update((current) =>
      current.map((row) =>
        row.investor_key === investorKey
          ? {
              ...row,
              investor_alias_name: value,
            }
          : row,
      ),
    );
    this.errorMessage.set('');
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

  formatDwhDate(value: string | null): string {
    return formatDwhDateForExport(value);
  }

  exportExcel(): void {
    this.runExport('excel');
  }

  exportPdf(): void {
    this.runExport('pdf');
  }

  saveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    const changedRows = this.collectChangedRowsAcrossGrid();
    if (!changedRows.length) {
      this.toastService.info('No changes detected to save.');
      this.errorMessage.set('');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    const payloads: InvestorAliasUpdatePayload[] = changedRows.map(
      (row) => this.buildChangedPayload(row)!,
    );
    const request: InvestorAliasBulkUpdateRequest = { Investors: payloads };
    const payloadByKey = new Map(payloads.map((payload) => [payload.investor_key, payload]));

    this.investorApi.updateInvestorAliasesBulk(request).subscribe({
      next: () => {
        const now = new Date().toISOString().slice(0, 10);
        const changedKeys = new Set(changedRows.map((row) => row.investor_key));

        this.rows.update((current) =>
          current.map((row) =>
            changedKeys.has(row.investor_key)
              ? {
                  ...row,
                  investor_alias_name: row.investor_alias_name.trim() || row.investor_name,
                  user_updated_date: now,
                  user_updated_by:
                    payloadByKey.get(row.investor_key)?.user_updated_by ?? row.user_updated_by,
                }
              : row,
          ),
        );

        this.snapshotOriginalState();
        this.toastService.success('Investor alias updates saved successfully.');
        this.errorMessage.set('');
        this.isSaving.set(false);
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
      filename: buildInvestorAliasExportFilename(format === 'excel' ? 'xlsx' : 'pdf'),
      sheetName: 'Investor Alias',
      title: 'Investor Alias Details',
      columns: INVESTOR_ALIAS_EXPORT_COLUMNS,
      rows: exportRows,
    };

    if (format === 'excel') {
      this.excelService.export(exportOptions);
      this.toastService.success(`Exported ${exportRows.length} investor(s) to Excel.`);
    } else {
      this.pdfService.export(exportOptions);
      this.toastService.success(`Exported ${exportRows.length} investor(s) to PDF.`);
    }

    this.isExporting.set(false);
  }

  private loadInvestors(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.investorApi.getInvestors().subscribe({
      next: (response) => {
        const mappedRows = response
          .map((record) => this.mapApiInvestorToRow(record))
          .filter((row) => Number.isFinite(row.investor_key) && row.investor_key > 0);

        this.rows.set(mappedRows);
        this.currentPage.set(1);
        this.snapshotOriginalState();
        this.isLoading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.errorMessage.set('Unable to fetch investors. Verify API availability and CORS.');
        this.isLoading.set(false);
      },
    });
  }

  private applyTableFiltersAndSort(rows: InvestorAliasRow[]): InvestorAliasRow[] {
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

  private getColumnValue(row: InvestorAliasRow, columnId: string): string {
    switch (columnId) {
      case 'investorCode':
        return row.investor_code;
      case 'investor':
        return row.investor_name;
      case 'investorAlias':
        return row.investor_alias_name;
      case 'dateDwhUpdate':
        return formatDwhDateForExport(row.user_updated_date);
      default:
        return '';
    }
  }

  private mapApiInvestorToRow(record: InvestorAliasRow): InvestorAliasRow {
    return {
      investor_key: Number(record.investor_key),
      investor_code: record.investor_code || '-',
      investor_name: record.investor_name || '-',
      investor_alias_name: record.investor_alias_name || '',
      user_updated_date: this.normalizeDate(record.user_updated_date),
      user_updated_by: record.user_updated_by || '-',
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<number, { investor_alias_name: string }> = {};
    for (const row of this.rows()) {
      snapshot[row.investor_key] = {
        investor_alias_name: row.investor_alias_name.trim(),
      };
    }
    this.originalRowState.set(snapshot);
  }

  private collectChangedRowsAcrossGrid(): InvestorAliasRow[] {
    return this.rows().filter((row) => this.isAliasChanged(row));
  }

  private isAliasChanged(row: InvestorAliasRow): boolean {
    const original = this.originalRowState()[row.investor_key];
    const currentAlias = row.investor_alias_name.trim();
    const baselineAlias = original?.investor_alias_name ?? '';
    return currentAlias !== baselineAlias;
  }

  private buildChangedPayload(row: InvestorAliasRow): InvestorAliasUpdatePayload | null {
    if (!this.isAliasChanged(row)) {
      return null;
    }

    const normalizedAlias = row.investor_alias_name.trim() || row.investor_name;
    const updatedBy =
      row.user_updated_by && row.user_updated_by.trim().length > 0 && row.user_updated_by !== '-'
        ? row.user_updated_by
        : this.defaultUpdatedBy;
    return {
      investor_key: row.investor_key,
      investor_alias_name: normalizedAlias,
      user_updated_date: new Date().toISOString(),
      user_updated_by: updatedBy,
    };
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to save investor alias changes.';
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

  private normalizeDate(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toISOString().slice(0, 10);
  }
}
