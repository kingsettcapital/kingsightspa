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
  toStatusSelectOptions,
} from '../../core/utils/mortgage-status-filter.util';
import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { LoanAliasApiService } from '../../core/services/loan-alias-api.service';
import {
  LtvValidationApiService,
  LtvValidationBulkUpdateRequest,
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
  private readonly currentAppUser = inject(CurrentAppUserService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly apiConfig = inject(APP_API_CONFIG);
  private readonly defaultPageSize = 10;

  readonly tableColumns = LTV_TABLE_COLUMNS;
  readonly updateReasonOptions = [...LTV_UPDATE_REASON_OPTIONS];

  readonly aliasOptions = signal<AliasOption[]>([]);
  readonly statusOptions = signal<LoanStatusFilterOption[]>([]);
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

  readonly selectedAliases = computed(() => {
    const ids = new Set(this.selectedLoanAliasIds());
    return this.aliasOptions().filter((a) => ids.has(a.loanAliasId));
  });

  /** Search Loans dropdown — loan code + name from loaded grid (aliases are often blank). */
  readonly loanSelectOptions = computed(() => {
    const seen = new Set<string>();
    const options: { label: string; value: string }[] = [];
    for (const row of this.rows()) {
      const code = row.loanCode?.trim() ?? '';
      if (!code || seen.has(code)) {
        continue;
      }
      seen.add(code);
      const name = row.loanName?.trim() || '—';
      const alias = row.loanAliasName?.trim();
      const aliasPart = alias && alias !== '-' ? ` · ${alias}` : '';
      options.push({
        label: `${code} — ${name}${aliasPart}`,
        value: code,
      });
    }
    return options.sort((a, b) => a.value.localeCompare(b.value));
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
      this.tableColumns,
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
    this.selectedQrSlideUrl.set(previewUrl);
    this.selectedQrSlideTitle.set(row.loanName || row.qrSlideLabel || row.loanCode);
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
    if (this.isConfirming() || !this.rows().length) {
      return;
    }

    const loanKeys = this.confirmableLoanKeys();
    if (!loanKeys.length) {
      this.statusMessage.set('No unmodified rows available to confirm. Save manual LTV edits first.');
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

    this.ltvApi.confirmAiLtv({ loanKeys, userUpdatedBy }).subscribe({
      next: () => {
        this.statusMessage.set(`${loanKeys.length} loan(s) confirmed with AI-extracted LTV.`);
        this.isConfirming.set(false);
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
    }).subscribe({
      next: ({ aliases, statuses }) => {
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
        this.selectedStatuses.set([]);
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
      case 'ltv':
      case 'aiConfidenceScore':
        return (left[column] ?? Number.NEGATIVE_INFINITY) - (right[column] ?? Number.NEGATIVE_INFINITY);
      case 'ltvChange':
        return (
          (this.computeLtvChange(left) ?? Number.NEGATIVE_INFINITY) -
          (this.computeLtvChange(right) ?? Number.NEGATIVE_INFINITY)
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
      ltv: this.pickNullableNumber(raw, 'ltv', 'Ltv', 'LTV', 'currentLtv', 'CurrentLtv'),
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
    return Math.min(100, Math.max(0, parsed));
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
