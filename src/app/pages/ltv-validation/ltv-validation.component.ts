import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { APP_API_CONFIG } from '../../core/constants/api.config';
import { filterRowsByTableSearch } from '../../core/utils/mortgage-table-search';
import { buildMortgageGridLoadMessage } from '../../core/utils/mortgage-grid-load-message.util';
import {
  normalizeStatusOptions,
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import {
  CmhcUploadApiService,
  CmhcUploadHistoryRecord,
} from '../../core/services/cmhc-upload-api.service';
import { LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LtvValidationApiService,
  LtvValidationBulkUpdateRequest,
  LtvValidationColumnDatesDto,
  LtvValidationRowDto,
} from '../../core/services/ltv-validation-api.service';
import {
  LoanSecurityValueApiService,
  LoanStatusFilterOption,
} from '../../core/services/loan-security-value-api.service';

type AliasOption = {
  loanAliasId: number;
  loanAliasName: string;
};

type LtvValidationRow = {
  rowTrackId: string;
  loanKey: number;
  loanCode: string;
  loanName: string;
  loanAliasName: string;
  investorAliasName: string;
  securityValue: number | null;
  exposure: number | null;
  ranking: number | null;
  priorLtv: number | null;
  ltv: number | null;
  /**
   * Sort key for Current LTV / LTV Change. Frozen while editing so live `ltv`
   * keystrokes do not reshuffle rows; refreshed on load, save, and sort-header click.
   */
  ltvSortValue: number | null;
  updateReasons: string[];
  updateComment: string;
  aiConfidenceScore: number | null;
  qrSlideLink: string;
  qrSlideLabel: string;
  userUpdatedBy: string;
  userUpdatedDate: string;
};

type RowSnapshot = {
  ltv: number | null;
  updateReasons: string[];
  updateComment: string;
};

/** Meta shown in the QR slide preview header (deck + as-of + loan). */
type QrSlidePreviewMeta = {
  loanName: string;
  fileName: string;
  asOfDate: string;
};

type LtvColumnKey =
  | 'loanCode'
  | 'loanName'
  | 'loanAliasName'
  | 'investorAliasName'
  | 'securityValue'
  | 'exposure'
  | 'ranking'
  | 'priorLtv'
  | 'ltv'
  | 'ltvChange'
  | 'updateReasons'
  | 'updateComment'
  | 'aiConfidenceScore'
  | 'userUpdatedBy'
  | 'userUpdatedDate';

type LtvTableColumn = {
  key: LtvColumnKey;
  label: string;
  audit?: boolean;
};

export const LTV_UPDATE_REASON_OPTIONS = [
  'Loan ID Missing from Slides',
  'Incorrect LTV Picked Up',
  'Mapped to Wrong Investor',
  'No Slide in Pack',
  'Slide Value Incorrect',
  'Yardi Value Incorrect',
  'OTHER',
] as const;

const LTV_TABLE_COLUMNS: LtvTableColumn[] = [
  { key: 'loanCode', label: 'Loan Code' },
  { key: 'loanName', label: 'Loan Name' },
  { key: 'loanAliasName', label: 'Loan Alias' },
  { key: 'investorAliasName', label: 'Investor Alias' },
  { key: 'securityValue', label: 'Sec. Value' },
  { key: 'exposure', label: 'Exposure' },
  { key: 'ranking', label: 'Rank' },
  { key: 'priorLtv', label: 'Prior LTV' },
  { key: 'ltv', label: 'Current LTV' },
  { key: 'ltvChange', label: 'LTV Change' },
  { key: 'updateReasons', label: 'Update Reason' },
  { key: 'updateComment', label: 'Update Comment' },
  { key: 'aiConfidenceScore', label: 'AI Score' },
  { key: 'userUpdatedBy', label: 'Modified By', audit: true },
  { key: 'userUpdatedDate', label: 'Modified Date', audit: true },
];

@Component({
  selector: 'app-ltv-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  templateUrl: './ltv-validation.component.html',
  styleUrl: './ltv-validation.component.css',
})
export class LtvValidationComponent implements OnInit, OnDestroy {
  private readonly ltvApi = inject(LtvValidationApiService);
  private readonly http = inject(HttpClient);
  private readonly loanAliasApi = inject(LoanAliasApiService);
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly cmhcUploadApi = inject(CmhcUploadApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly apiConfig = inject(APP_API_CONFIG);
  private readonly defaultPageSize = 10;

  readonly updateReasonOptions = [...LTV_UPDATE_REASON_OPTIONS];

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
  /** QR-slides upload history, newest first (QR preview matching). */
  readonly qrSlideUploads = signal<CmhcUploadHistoryRecord[]>([]);
  readonly currentLtvAsOfDate = signal<string | null>(null);
  readonly priorLtvConfirmedDate = signal<string | null>(null);
  readonly searchText = signal('');
  readonly selectedLoanAliasIds = signal<number[]>([]);
  /** Client-side loan filter for Search Loans (code / name). */
  readonly selectedLoanCodes = signal<string[]>([]);
  readonly selectedStatuses = signal<string[]>([]);
  readonly sortColumn = signal<LtvColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly rows = signal<LtvValidationRow[]>([]);
  readonly originalRowState = signal<Record<string, RowSnapshot>>({});
  readonly selectedQrSlideUrl = signal<string | null>(null);
  readonly selectedQrSlideTitle = signal('');
  readonly selectedQrSlideMeta = signal<QrSlidePreviewMeta | null>(null);
  readonly pdfPreviewBlobUrl = signal<SafeResourceUrl | null>(null);
  readonly previewMediaType = signal<'pdf' | 'image' | null>(null);
  readonly isLoadingPreview = signal(false);
  readonly previewError = signal('');
  readonly previewZoom = signal(1);

  readonly showPreviewModal = signal(false);
  readonly slidePaneCollapsed = signal(false);

  private previewObjectUrl: string | null = null;

  readonly statusMessage = signal('');
  readonly errorMessage = signal('');
  readonly isLoadingFilters = signal(false);
  readonly isLoadingGrid = signal(false);
  readonly isSaving = signal(false);
  readonly isConfirming = signal(false);
  readonly currentPage = signal(1);
  readonly pageSize = signal(this.defaultPageSize);
  /** Ignores the empty search emit ng-select fires right after selecting a chip. */
  private suppressEmptySearchClear = false;

  ngOnInit(): void {
    this.loadFilters();
  }

  ngOnDestroy(): void {
    this.revokePreviewBlob();
  }

  /**
   * Current LTV date = latest QR-slides File Upload As Of.
   * Prior LTV date = MAX(ltv_updated_datetime) on loan_alias_relationship.
   */
  readonly currentLtvAsOfDisplay = computed(() =>
    this.formatAsOfHeaderDate(this.currentLtvAsOfDate()),
  );

  readonly priorLtvAsOfDisplay = computed(() =>
    this.formatConfirmHeaderDate(this.priorLtvConfirmedDate()),
  );

  readonly tableColumns = computed<LtvTableColumn[]>(() => {
    const priorAsOf = this.priorLtvAsOfDisplay();
    const currentAsOf = this.currentLtvAsOfDisplay();
    return LTV_TABLE_COLUMNS.map((column) => {
      if (column.key === 'priorLtv') {
        return {
          ...column,
          label: priorAsOf ? `Prior LTV ${priorAsOf}` : 'Prior LTV',
        };
      }
      if (column.key === 'ltv') {
        return {
          ...column,
          label: currentAsOf ? `Current LTV ${currentAsOf}` : 'Current LTV',
        };
      }
      return column;
    });
  });

  readonly selectedAliases = computed(() => {
    const ids = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((a) => ids.has(a.loanAliasId));
  });

  /** Search Loans autocomplete — loan code + name from loaded grid (aliases are often blank). */
  readonly searchedLoanOptions = computed(() => {
    const keyword = this.searchText().trim();
    if (!keyword) {
      return [];
    }

    const selectedCodes = new Set(this.selectedLoanCodes());
    const seen = new Set<string>();
    const matches: LtvValidationRow[] = [];

    for (const row of this.rows()) {
      const code = row.loanCode?.trim() ?? '';
      if (!code || selectedCodes.has(code) || seen.has(code)) {
        continue;
      }
      if (
        filterRowsByTableSearch(
          [row],
          keyword,
          this.tableColumns(),
          (candidate, key) => this.getCellDisplayValue(candidate, key),
        ).length > 0
      ) {
        seen.add(code);
        matches.push(row);
      }
    }

    return matches.sort((left, right) => left.loanCode.localeCompare(right.loanCode));
  });

  readonly selectedLoans = computed(() => {
    const selectedCodes = new Set(this.selectedLoanCodes());
    const seen = new Set<string>();
    return this.rows().filter((row) => {
      const code = row.loanCode?.trim() ?? '';
      if (!code || !selectedCodes.has(code) || seen.has(code)) {
        return false;
      }
      seen.add(code);
      return true;
    });
  });

  readonly statusSelectOptions = computed(() => toStatusSelectOptions(this.statusOptions()));

  readonly filteredRows = computed(() => {
    let rows = this.rows();

    const selectedCodes = this.selectedLoanCodes();
    if (selectedCodes.length > 0) {
      const codeSet = new Set(selectedCodes);
      rows = rows.filter((row) => codeSet.has(row.loanCode));
    }

    rows = filterRowsByTableSearch(
      rows,
      this.searchText(),
      this.tableColumns(),
      (row, key) => this.getCellDisplayValue(row, key),
    );

    const activeSort = this.sortColumn();
    if (activeSort) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      rows = [...rows].sort(
        (left, right) => this.compareRows(left, right, activeSort) * direction,
      );
    } else {
      rows = this.sortRowsDefault(rows);
    }

    return rows;
  });

  readonly gridLoadMessage = computed(() =>
    buildMortgageGridLoadMessage({
      isLoading: this.isLoadingGrid() || this.isLoadingFilters(),
      totalRows: this.rows().length,
      visibleRows: this.filteredRows().length,
      hasClientFilter:
        this.searchText().trim().length > 0 || this.selectedLoanCodes().length > 0,
      emptyMessage: 'No loans returned for the selected filters.',
    }),
  );

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

  readonly confirmableLoanKeys = computed(() =>
    this.rows()
      .filter((row) => !this.hasRowChanged(row))
      .map((row) => row.loanKey)
      .filter((key) => key > 0),
  );

  readonly confirmableLoanCodes = computed(() =>
    this.rows()
      .filter((row) => !this.hasRowChanged(row))
      .map((row) => row.loanCode?.trim() || '')
      .filter((code) => !!code && code !== '-'),
  );

  /** Approvers may Confirm only when the grid has no pending edits. */
  readonly hasUnsavedChanges = computed(() => this.rows().some((row) => this.hasRowChanged(row)));

  readonly canConfirmLtv = computed(
    () =>
      !this.isConfirming() &&
      !this.hasUnsavedChanges() &&
      (this.confirmableLoanCodes().length > 0 || this.confirmableLoanKeys().length > 0),
  );

  readonly pdfPreviewUrl = computed(() => this.pdfPreviewBlobUrl());

  readonly previewZoomLabel = computed(() => `${Math.round(this.previewZoom() * 100)}%`);

  readonly previewImageWidth = computed(() => `${Math.round(this.previewZoom() * 100)}%`);

  updateSearch(value: string): void {
    this.searchText.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  /** Live typeahead → grid filter (keeps last term when ng-select clears search after a chip select). */
  onLoanSearch(event: { term: string } | string | null): void {
    const term = typeof event === 'string' ? event : (event?.term ?? '');
    if (!term.trim() && this.suppressEmptySearchClear) {
      return;
    }
    this.updateSearch(term);
  }

  updateSelectedLoans(codes: string[] | null): void {
    this.suppressEmptySearchClear = true;
    this.selectedLoanCodes.set(codes ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    queueMicrotask(() => {
      this.suppressEmptySearchClear = false;
    });
  }

  updateSelectedAliases(ids: number[] | null): void {
    this.selectedLoanAliasIds.set(ids ?? []);
    this.searchText.set('');
    this.selectedLoanCodes.set([]);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  updateSelectedStatuses(statuses: string[] | null): void {
    this.selectedStatuses.set(statuses ?? []);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  clearSelection(): void {
    this.searchText.set('');
    this.selectedLoanCodes.set([]);
    this.selectedLoanAliasIds.set([]);
    this.selectedStatuses.set([]);
    this.currentPage.set(1);
    this.clearMessages();
    this.loadGrid();
  }

  selectLoan(row: LtvValidationRow): void {
    const code = row.loanCode?.trim() ?? '';
    if (!code || this.selectedLoanCodes().includes(code)) {
      return;
    }
    this.selectedLoanCodes.set([...this.selectedLoanCodes(), code]);
    this.searchText.set('');
    this.currentPage.set(1);
    this.clearMessages();
  }

  removeSelectedLoan(loanCode: string): void {
    this.selectedLoanCodes.set(this.selectedLoanCodes().filter((code) => code !== loanCode));
    this.currentPage.set(1);
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

  toggleSort(column: LtvColumnKey): void {
    // Capture current editable LTV into sort snapshots before applying sort,
    // so header clicks use latest values without reshuffling on each keystroke.
    if (column === 'ltv' || column === 'ltvChange') {
      this.refreshLtvSortSnapshots();
    }

    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: LtvColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  updateLtv(row: LtvValidationRow, value: string): void {
    const parsed = this.parsePercentInput(value);
    this.patchRow(row.rowTrackId, { ltv: parsed });
  }

  updateUpdateReasons(row: LtvValidationRow, values: string[] | null): void {
    this.patchRow(row.rowTrackId, { updateReasons: values ? [...values] : [] });
  }

  updateUpdateComment(row: LtvValidationRow, value: string): void {
    this.patchRow(row.rowTrackId, { updateComment: value });
  }

  openQrSlide(row: LtvValidationRow): void {
    const originalLink = row.qrSlideLink?.trim();
    if (!originalLink) {
      this.statusMessage.set('No QR slide PDF is linked for this row.');
      return;
    }

    const previewUrl = this.resolveQrSlidePreviewUrl(originalLink);
    const loanName = row.loanName?.trim() || row.loanCode || '—';
    const pack = this.resolveQrSlidePack(originalLink);
    const fileName =
      pack?.filename?.trim()
      || this.extractQrSlideFileName(originalLink)
      || row.qrSlideLabel
      || '—';
    const asOfDate = this.formatAsOfHeaderDate(pack?.asOfDate) || this.currentLtvAsOfDisplay() || '—';

    this.selectedQrSlideUrl.set(previewUrl);
    this.selectedQrSlideTitle.set(loanName);
    this.selectedQrSlideMeta.set({ loanName, fileName, asOfDate });
    this.previewZoom.set(1);
    this.showPreviewModal.set(false);
    this.loadQrSlidePreview(previewUrl);
    this.clearMessages();
  }

  openPreviewModal(): void {
    if (this.isLoadingPreview() || this.previewError() || !this.pdfPreviewUrl()) {
      return;
    }
    this.previewZoom.set(1);
    this.showPreviewModal.set(true);
  }

  closePreviewModal(): void {
    this.showPreviewModal.set(false);
    this.previewZoom.set(1);
  }

  zoomInPreview(): void {
    this.previewZoom.update((zoom) => Math.min(Math.round((zoom + 0.25) * 100) / 100, 4));
  }

  zoomOutPreview(): void {
    this.previewZoom.update((zoom) => Math.max(Math.round((zoom - 0.25) * 100) / 100, 0.5));
  }

  resetPreviewZoom(): void {
    this.previewZoom.set(1);
  }

  private loadQrSlidePreview(previewUrl: string): void {
    this.revokePreviewBlob();
    this.previewError.set('');
    this.previewMediaType.set(null);
    this.isLoadingPreview.set(true);

    this.http.get(previewUrl, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob?.size) {
          this.previewError.set(
            'QR slide file was not found. Upload the matching PDF or PNG via File Upload → QR Slides.',
          );
          this.isLoadingPreview.set(false);
          return;
        }

        const contentType = response.headers.get('Content-Type') ?? blob.type ?? '';
        this.previewMediaType.set(contentType.startsWith('image/') ? 'image' : 'pdf');
        this.previewObjectUrl = URL.createObjectURL(blob);
        this.pdfPreviewBlobUrl.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(this.previewObjectUrl),
        );
        this.isLoadingPreview.set(false);
      },
      error: (error) => {
        this.isLoadingPreview.set(false);
        this.previewError.set(this.extractPreviewError(error));
      },
    });
  }

  private revokePreviewBlob(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.pdfPreviewBlobUrl.set(null);
    this.previewMediaType.set(null);
  }

  private extractPreviewError(error: unknown): string {
    if (error && typeof error === 'object') {
      const httpError = error as {
        status?: number;
        error?: { message?: string; detail?: string } | string;
      };
      if (httpError.status === 404) {
        const backendMessage =
          typeof httpError.error === 'string'
            ? httpError.error
            : httpError.error?.detail || httpError.error?.message;
        if (backendMessage?.trim()) {
          return backendMessage.trim();
        }
        return 'QR slide file was not found. Upload the matching PDF or PNG via File Upload → QR Slides.';
      }
    }
    return this.extractBackendError(error, 'Unable to load QR slide preview.');
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

    const ltvChangedWithoutReason = changedRows.filter((row) => {
      const original = this.originalRowState()[row.rowTrackId];
      return (
        original &&
        row.ltv !== original.ltv &&
        this.serializeUpdateReasons(row.updateReasons).length === 0
      );
    });
    if (ltvChangedWithoutReason.length) {
      this.errorMessage.set(
        'Update Reason is required when Current LTV is modified.',
      );
      this.statusMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const request: LtvValidationBulkUpdateRequest = {
      loans: changedRows.map((row) => ({
        loanKey: row.loanKey,
        loanCode: row.loanCode !== '-' ? row.loanCode : null,
        ltv: row.ltv,
        updateReason: this.serializeUpdateReasons(row.updateReasons),
        updateComment: this.nullIfEmpty(row.updateComment),
        userUpdatedBy,
      })),
    };

    this.isSaving.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    this.ltvApi.saveLtv(request).subscribe({
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

  confirmAiLtv(): void {
    if (!this.canConfirmLtv()) {
      if (this.hasUnsavedChanges()) {
        this.statusMessage.set('Save Changes before confirming LTV.');
        this.errorMessage.set('');
      }
      return;
    }

    const loanCodes = this.confirmableLoanCodes();
    const loanKeys = this.confirmableLoanKeys();
    if (!loanCodes.length && !loanKeys.length) {
      this.statusMessage.set('No loans available to confirm.');
      this.errorMessage.set('');
      return;
    }

    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isConfirming.set(true);
    this.statusMessage.set('');
    this.errorMessage.set('');

    this.ltvApi.confirmAiLtv({ loanKeys, loanCodes, userUpdatedBy }).subscribe({
      next: () => {
        const count = loanCodes.length || loanKeys.length;
        this.statusMessage.set(`${count} loan(s) confirmed with AI-extracted LTV.`);
        this.isConfirming.set(false);
        this.loadColumnDates();
        this.loadGrid();
      },
      error: (error) => {
        this.errorMessage.set(this.extractBackendError(error, 'Failed to confirm AI LTV values.'));
        this.isConfirming.set(false);
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

  toggleSlidePane(): void {
    this.slidePaneCollapsed.update((collapsed) => !collapsed);
  }

  truncateDisplay(value: string | null | undefined, maxLength: number): string {
    const trimmed = value?.trim() || '—';
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    return `${trimmed.slice(0, maxLength - 1)}…`;
  }

  formatCurrency(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '-';
    }
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 2,
    }).format(value);
  }

  formatCompactCurrency(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '-';
    }
    const abs = Math.abs(value);
    if (abs >= 1_000_000) {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    }
    if (abs >= 10_000) {
      return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(value);
    }
    return this.formatCurrency(value);
  }

  currencyTitle(value: number | null): string | null {
    if (value == null || !Number.isFinite(value)) {
      return null;
    }
    return this.formatCurrency(value);
  }

  formatPercent(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    return String(value);
  }

  formatLtvDisplay(value: number | null): string {
    // Prior and Current LTV may exceed 100% — display as-is (no clamp).
    if (value == null || !Number.isFinite(value)) {
      return '-';
    }
    return `${value}%`;
  }

  /**
   * Frontend-only: Current LTV − Prior LTV (no DB column).
   * Missing Prior is treated as 0 so change still shows when Current is set.
   */
  computeLtvChange(row: LtvValidationRow): number | null {
    if (row.ltv == null || !Number.isFinite(row.ltv)) {
      return null;
    }
    const prior =
      row.priorLtv != null && Number.isFinite(row.priorLtv) ? row.priorLtv : 0;
    return Math.round((row.ltv - prior) * 100) / 100;
  }

  formatLtvChange(row: LtvValidationRow): string {
    const change = this.computeLtvChange(row);
    if (change == null) {
      return '-';
    }
    if (change === 0) {
      return '0%';
    }
    const prefix = change > 0 ? '+' : '';
    return `${prefix}${change}%`;
  }

  isLtvChanged(row: LtvValidationRow): boolean {
    const original = this.originalRowState()[row.rowTrackId];
    return !!original && row.ltv !== original.ltv;
  }

  formatConfidenceScore(value: number | null): string {
    if (value == null || !Number.isFinite(value)) {
      return '-';
    }
    return value.toFixed(2);
  }

  formatModifiedDate(value: string): string {
    if (!value?.trim()) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
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

  formatRanking(value: number | null): string {
    if (value == null || !Number.isFinite(value) || value <= 0) {
      return '-';
    }
    return String(value);
  }

  columnClass(column: LtvColumnKey): string {
    const classes: string[] = ['ltv-cell'];
    switch (column) {
      case 'loanCode':
        classes.push('ltv-col--code');
        break;
      case 'loanName':
        classes.push('ltv-col--name');
        break;
      case 'loanAliasName':
        classes.push('ltv-col--alias');
        break;
      case 'investorAliasName':
        classes.push('ltv-col--investor');
        break;
      case 'securityValue':
      case 'exposure':
        classes.push('numeric-col', 'ltv-col--currency');
        break;
      case 'ranking':
        classes.push('numeric-col', 'ltv-col--rank');
        break;
      case 'priorLtv':
        classes.push('numeric-col', 'ltv-col--prior-ltv');
        break;
      case 'ltv':
        classes.push('numeric-col', 'ltv-col--ltv', 'editable-col');
        break;
      case 'ltvChange':
        classes.push('numeric-col', 'ltv-col--ltv-change');
        break;
      case 'updateReasons':
        classes.push('editable-col', 'ltv-col--reason');
        break;
      case 'updateComment':
        classes.push('editable-col', 'ltv-col--comment');
        break;
      case 'aiConfidenceScore':
        classes.push('numeric-col', 'ltv-col--confidence');
        break;
      case 'userUpdatedBy':
      case 'userUpdatedDate':
        classes.push('audit-col', 'ltv-col--audit');
        break;
    }
    return classes.join(' ');
  }

  private patchRow(rowTrackId: string, patch: Partial<LtvValidationRow>): void {
    this.rows.set(
      this.rows().map((row) =>
        row.rowTrackId === rowTrackId ? { ...row, ...patch } : row,
      ),
    );
    this.clearMessages();
  }

  private loadFilters(): void {
    this.isLoadingFilters.set(true);
    this.errorMessage.set('');

    forkJoin({
      aliases: this.loanAliasApi.getAll().pipe(catchError(() => of([]))),
      statuses: this.securityValueApi.getStatuses().pipe(catchError(() => of([]))),
      uploads: this.cmhcUploadApi.getHistory().pipe(catchError(() => of([]))),
      columnDates: this.ltvApi.getColumnDates().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ aliases, statuses, uploads, columnDates }) => {
        this.aliasOptions.set(
          aliases
            .map((a) => ({
              loanAliasId: Number(a.loanAliasId ?? a.loanAliasKey ?? 0),
              loanAliasName: a.loanAliasName?.trim() || '-',
            }))
            .filter((a) => a.loanAliasId > 0)
            .sort((a, b) => a.loanAliasName.localeCompare(b.loanAliasName)),
        );

        this.statusOptions.set(normalizeStatusOptions(statuses));
        this.qrSlideUploads.set(this.normalizeQrSlideUploads(uploads));
        this.applyColumnDates(columnDates, this.qrSlideUploads());
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

  private loadColumnDates(): void {
    this.ltvApi.getColumnDates().subscribe({
      next: (dates) => this.applyColumnDates(dates, this.qrSlideUploads()),
      error: () => this.applyColumnDates(null, this.qrSlideUploads()),
    });
  }

  private applyColumnDates(
    dates: LtvValidationColumnDatesDto | null,
    qrUploads: CmhcUploadHistoryRecord[],
  ): void {
    this.currentLtvAsOfDate.set(dates?.currentLtvAsOfDate?.trim() || qrUploads[0]?.asOfDate || null);
    this.priorLtvConfirmedDate.set(dates?.priorLtvConfirmedDate?.trim() || null);
  }

  /** Selected aliases only; empty = all aliases (API skips alias filter). */
  private resolveLoanAliasIds(): number[] {
    return this.selectedLoanAliasIds().filter((id) => id > 0);
  }

  private loadGrid(): void {
    const loanAliasIds = this.resolveLoanAliasIds();
    const statuses = this.selectedStatuses();

    this.isLoadingGrid.set(true);
    this.errorMessage.set('');
    this.statusMessage.set('');

    this.ltvApi.getLoans(loanAliasIds, statuses).subscribe({
      next: (response) => {
        const records = this.normalizeRecords(response);
        const mapped = records.map((r) => this.mapRow(r));
        this.rows.set(this.sortRowsDefault(mapped));
        this.currentPage.set(1);
        this.snapshotOriginalState();
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

  private sortRowsDefault(rows: LtvValidationRow[]): LtvValidationRow[] {
    return [...rows].sort((a, b) => {
      const aEmpty = a.securityValue == null;
      const bEmpty = b.securityValue == null;
      if (aEmpty && !bEmpty) {
        return -1;
      }
      if (!aEmpty && bEmpty) {
        return 1;
      }
      const aSec = a.securityValue ?? 0;
      const bSec = b.securityValue ?? 0;
      if (bSec !== aSec) {
        return bSec - aSec;
      }
      const aRank = a.ranking ?? Number.MAX_SAFE_INTEGER;
      const bRank = b.ranking ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  }

  private compareRows(left: LtvValidationRow, right: LtvValidationRow, column: LtvColumnKey): number {
    switch (column) {
      case 'securityValue':
      case 'exposure':
      case 'ranking':
      case 'priorLtv':
      case 'aiConfidenceScore':
        return (left[column] ?? Number.NEGATIVE_INFINITY) - (right[column] ?? Number.NEGATIVE_INFINITY);
      case 'ltv':
        return (
          (left.ltvSortValue ?? Number.NEGATIVE_INFINITY) -
          (right.ltvSortValue ?? Number.NEGATIVE_INFINITY)
        );
      case 'ltvChange':
        return (
          (this.computeLtvChangeForSort(left) ?? Number.NEGATIVE_INFINITY) -
          (this.computeLtvChangeForSort(right) ?? Number.NEGATIVE_INFINITY)
        );
      case 'userUpdatedDate':
        return this.dateSortValue(left.userUpdatedDate) - this.dateSortValue(right.userUpdatedDate);
      case 'updateReasons':
        return this.serializeUpdateReasons(left.updateReasons).localeCompare(
          this.serializeUpdateReasons(right.updateReasons),
        );
      default:
        return this.getCellDisplayValue(left, column).localeCompare(
          this.getCellDisplayValue(right, column),
          undefined,
          { sensitivity: 'base' },
        );
    }
  }

  /** LTV Change for sorting — uses frozen `ltvSortValue`, not the live editable field. */
  private computeLtvChangeForSort(row: LtvValidationRow): number | null {
    if (row.ltvSortValue == null || !Number.isFinite(row.ltvSortValue)) {
      return null;
    }
    const prior =
      row.priorLtv != null && Number.isFinite(row.priorLtv) ? row.priorLtv : 0;
    return Math.round((row.ltvSortValue - prior) * 100) / 100;
  }

  private refreshLtvSortSnapshots(): void {
    this.rows.update((rows) =>
      rows.map((row) => ({
        ...row,
        ltvSortValue: row.ltv,
      })),
    );
  }

  private getCellDisplayValue(row: LtvValidationRow, column: LtvColumnKey): string {
    switch (column) {
      case 'loanCode':
        return row.loanCode;
      case 'loanName':
        return row.loanName;
      case 'loanAliasName':
        return row.loanAliasName;
      case 'investorAliasName':
        return row.investorAliasName;
      case 'securityValue':
        return this.formatCurrency(row.securityValue);
      case 'exposure':
        return this.formatCurrency(row.exposure);
      case 'ranking':
        return this.formatRanking(row.ranking);
      case 'priorLtv':
        return this.formatLtvDisplay(row.priorLtv);
      case 'ltv':
        return row.ltv == null ? '' : `${row.ltv}%`;
      case 'ltvChange':
        return this.formatLtvChange(row);
      case 'updateReasons':
        return this.serializeUpdateReasons(row.updateReasons);
      case 'updateComment':
        return row.updateComment;
      case 'aiConfidenceScore':
        return this.formatConfidenceScore(row.aiConfidenceScore);
      case 'userUpdatedBy':
        return this.displayModifiedBy(row.userUpdatedBy);
      case 'userUpdatedDate':
        return this.formatModifiedDate(row.userUpdatedDate);
      default:
        return '';
    }
  }

  private normalizeRecords(response: unknown): LtvValidationRowDto[] {
    if (Array.isArray(response)) {
      return response as LtvValidationRowDto[];
    }
    if (response && typeof response === 'object') {
      const obj = response as Record<string, unknown>;
      for (const key of ['loans', 'data', 'results', 'items', 'value']) {
        const candidate = obj[key];
        if (Array.isArray(candidate)) {
          return candidate as LtvValidationRowDto[];
        }
      }
    }
    return [];
  }

  private mapRow(record: LtvValidationRowDto): LtvValidationRow {
    const raw = record as LtvValidationRowDto & Record<string, unknown>;
    const loanKey = this.pickNumber(raw, 'loanKey', 'LoanKey');
    const loanCode =
      this.pickString(raw, 'loanCode', 'LoanCode', 'childLoanId', 'ChildLoanId', 'loanId', 'LoanId') ||
      '-';
    const loanName =
      this.pickString(raw, 'loanName', 'LoanName', 'description', 'Description') || '-';
    const loanAliasName = this.pickString(raw, 'loanAliasName', 'LoanAliasName') || '-';
    const qrSlideLink = this.pickString(raw, 'qrSlideLink', 'QrSlideLink') || '';
    const rowTrackId =
      loanKey > 0 ? String(loanKey) : `${loanCode}|${loanAliasName}|${loanName}`;
    const ltv = this.pickNullableNumber(raw, 'ltv', 'Ltv', 'LTV', 'currentLtv', 'CurrentLtv');
    return {
      rowTrackId,
      loanKey,
      loanCode,
      loanName,
      loanAliasName,
      investorAliasName: this.pickString(raw, 'investorAliasName', 'InvestorAliasName') || '-',
      securityValue: this.pickNullableNumber(raw, 'securityValue', 'SecurityValue'),
      exposure: this.pickNullableNumber(raw, 'exposure', 'Exposure'),
      ranking: this.pickNullableNumber(raw, 'ranking', 'Ranking', 'loanRanking', 'LoanRanking'),
      priorLtv: this.pickNullableNumber(raw, 'priorLtv', 'PriorLtv', 'prior_ltv'),
      ltv,
      ltvSortValue: ltv,
      updateReasons: this.parseUpdateReasons(
        this.pickString(raw, 'updateReason', 'UpdateReason'),
      ),
      updateComment: this.pickString(raw, 'updateComment', 'UpdateComment') || '',
      aiConfidenceScore: this.pickNullableNumber(
        raw,
        'aiConfidenceScore',
        'AiConfidenceScore',
        'AIConfidenceScore',
      ),
      qrSlideLink,
      qrSlideLabel: this.buildQrSlideLabel(qrSlideLink, loanName, loanCode),
      userUpdatedBy: this.pickString(raw, 'userUpdatedBy', 'UserUpdatedBy') || '-',
      userUpdatedDate: this.pickString(raw, 'userUpdatedDate', 'UserUpdatedDate'),
    };
  }

  private rowSnapshot(row: LtvValidationRow): RowSnapshot {
    return {
      ltv: row.ltv,
      updateReasons: [...row.updateReasons],
      updateComment: row.updateComment,
    };
  }

  private snapshotOriginalState(): void {
    const snapshot: Record<string, RowSnapshot> = {};
    for (const row of this.rows()) {
      snapshot[row.rowTrackId] = this.rowSnapshot(row);
    }
    this.originalRowState.set(snapshot);
  }

  private hasRowChanged(row: LtvValidationRow): boolean {
    const original = this.originalRowState()[row.rowTrackId];
    if (!original) {
      return true;
    }
    return JSON.stringify(this.rowSnapshot(row)) !== JSON.stringify(original);
  }

  private parseUpdateReasons(value: string): string[] {
    if (!value?.trim()) {
      return [];
    }
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  private serializeUpdateReasons(values: string[]): string {
    return values.filter(Boolean).join(', ');
  }

  private buildQrSlideLabel(link: string, loanName: string, loanCode: string): string {
    if (!link.trim()) {
      return '';
    }
    if (loanName.trim() && loanName !== '-') {
      return loanName.trim();
    }
    return loanCode.trim() || 'View QR Slide';
  }

  /** Newest QR-slides uploads first (QR preview matching). */
  private normalizeQrSlideUploads(uploads: unknown): CmhcUploadHistoryRecord[] {
    if (!Array.isArray(uploads) || !uploads.length) {
      return [];
    }

    return (uploads as Record<string, unknown>[])
      .map((row) => ({
        fileId: Number(row['fileId'] ?? row['file_id'] ?? 0),
        filename: String(row['filename'] ?? row['fileName'] ?? '').trim(),
        fileType: String(row['fileType'] ?? row['file_type'] ?? '').trim().toLowerCase(),
        uploadedDate: String(row['uploadedDate'] ?? row['uploaded_date'] ?? '').trim(),
        uploadedBy: String(row['uploadedBy'] ?? row['uploaded_by'] ?? '').trim(),
        asOfDate: String(row['asOfDate'] ?? row['as_of_date'] ?? '').trim() || null,
      }))
      .filter((row) => {
        const type = row.fileType ?? '';
        if (type === 'qr-slides' || type === 'qr_slides' || type.includes('qr')) {
          return true;
        }
        // Legacy rows may lack file_type — treat PDF history as QR slides.
        return !type && /\.pdf$/i.test(row.filename);
      })
      .sort((a, b) => {
        const aTime = Date.parse(a.uploadedDate) || 0;
        const bTime = Date.parse(b.uploadedDate) || 0;
        return bTime - aTime;
      });
  }

  /** Rajeev format: MM.DD.YY (e.g. 07.24.26). Date-only As Of — do not apply time zone. */
  private formatAsOfHeaderDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '';
    }

    const trimmed = value.trim();
    const dateOnly = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
    const [year, month, day] = dateOnly.split('-');
    if (year?.length === 4 && month && day) {
      return `${month}.${day}.${year.slice(-2)}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    const yy = String(parsed.getFullYear()).slice(-2);
    return `${mm}.${dd}.${yy}`;
  }

  /** Confirm click timestamp in America/New_York, same calendar date as Modified Date. */
  private formatConfirmHeaderDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '';
    }

    const parsed = new Date(value.trim());
    if (Number.isNaN(parsed.getTime())) {
      return this.formatAsOfHeaderDate(value);
    }

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    }).formatToParts(parsed);
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    const year = parts.find((part) => part.type === 'year')?.value;
    if (!month || !day || !year) {
      return this.formatAsOfHeaderDate(value);
    }

    return `${month}.${day}.${year}`;
  }

  /**
   * Match a slide link to its source QR pack (deck) from upload history.
   * Falls back to the newest pack when no filename match is found.
   */
  private resolveQrSlidePack(link: string): CmhcUploadHistoryRecord | null {
    const uploads = this.qrSlideUploads();
    if (!uploads.length) {
      return null;
    }

    const slideName = this.extractQrSlideFileName(link)?.toLowerCase() ?? '';
    const linkLower = link.toLowerCase();

    const matched = uploads.find((upload) => {
      const packName = upload.filename?.trim().toLowerCase() ?? '';
      if (!packName) {
        return false;
      }
      if (slideName && (slideName === packName || slideName.includes(packName) || packName.includes(slideName))) {
        return true;
      }
      return linkLower.includes(packName);
    });

    return matched ?? uploads[0] ?? null;
  }

  private extractQrSlideFileName(link: string): string {
    if (!link?.trim()) {
      return '';
    }

    try {
      const decoded = decodeURIComponent(link.trim());
      const withoutQuery = decoded.split('?')[0] ?? decoded;
      const segments = withoutQuery.split(/[/\\]/).filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i -= 1) {
        const segment = segments[i];
        if (/\.(pdf|png|jpe?g)$/i.test(segment)) {
          return segment;
        }
      }
      return segments[segments.length - 1] ?? '';
    } catch {
      return link.trim();
    }
  }

  private isFabricPortalUrl(url: string): boolean {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === 'app.fabric.microsoft.com' || host.endsWith('.fabric.microsoft.com');
    } catch {
      return false;
    }
  }

  private resolveQrSlidePreviewUrl(link: string): string {
    const baseUrl = this.apiConfig.baseUrl.replace(/\/+$/, '');
    if (link.includes('/api/CmhcUpload/qr-slides/preview')) {
      return link;
    }
    return `${baseUrl}/api/CmhcUpload/qr-slides/preview?link=${encodeURIComponent(link)}`;
  }

  isFabricPortalLink(link: string): boolean {
    return this.isFabricPortalUrl(link);
  }

  private parsePercentInput(value: string): number | null {
    const trimmed = value?.trim().replace(/%/g, '') ?? '';
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    // LTV may exceed 100% (underwater / high-risk). Keep a soft upper bound for bad input.
    return Math.min(999, Math.max(0, parsed));
  }

  private nullIfEmpty(value: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private dateSortValue(value: string): number {
    if (!value?.trim()) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
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

  private pickNullableNumber(
    record: Record<string, unknown>,
    ...keys: string[]
  ): number | null {
    for (const key of keys) {
      const value = record[key];
      if (value == null) {
        continue;
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value.trim().replace(/[,$%]/g, ''));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private pickString(record: Record<string, unknown>, ...keys: string[]): string {
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

  private extractBackendError(
    error: unknown,
    fallback = 'Failed to load or save LTV validation data.',
  ): string {
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
