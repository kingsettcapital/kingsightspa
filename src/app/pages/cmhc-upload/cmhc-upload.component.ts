import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import { formatModifiedDate as formatAuditModifiedDate } from '../../core/utils/format-modified-date.util';
import {
  CmhcUploadApiService,
  CmhcUploadHistoryRecord,
  FILE_UPLOAD_TYPE_OPTIONS,
  FileUploadType,
  FileUploadTypeOption,
} from '../../core/services/cmhc-upload-api.service';

/** Placeholder UNIQUEIDENTIFIER for uploads until auth is wired (same intent as "system" on other screens). */
const SYSTEM_USER_GUID = '00000000-0000-0000-0000-000000000000';
const SYSTEM_USER_LABEL = 'system';

@Component({
  selector: 'app-cmhc-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cmhc-upload.component.html',
  styleUrl: './cmhc-upload.component.css',
})
export class CmhcUploadComponent implements OnInit {
  private readonly cmhcUploadApi = inject(CmhcUploadApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly fileTypeOptions = FILE_UPLOAD_TYPE_OPTIONS;
  readonly selectedFileType = signal<FileUploadType>('cmhc');
  readonly asOfDate = signal(this.todayIsoDate());
  readonly history = signal<CmhcUploadHistoryRecord[]>([]);
  readonly selectedFile = signal<File | null>(null);
  readonly isDragOver = signal(false);
  /** Start true so first paint shows loading — avoids empty → loading → data flicker. */
  readonly isLoadingHistory = signal(true);
  readonly isUploading = signal(false);
  readonly statusMessage = signal('');
  readonly errorMessage = signal('');

  readonly activeFileTypeOption = computed(
    () =>
      this.fileTypeOptions.find((option) => option.value === this.selectedFileType()) ??
      this.fileTypeOptions[0],
  );

  ngOnInit(): void {
    this.loadHistory();
  }

  onFileTypeChange(value: string): void {
    const nextType = value === 'qr-slides' ? 'qr-slides' : 'cmhc';
    this.selectedFileType.set(nextType);
    this.selectedFile.set(null);
    this.clearMessages();
  }

  onAsOfDateChange(value: string): void {
    this.asOfDate.set(value);
    this.clearMessages();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.setSelectedFile(file);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setSelectedFile(file);
    }
    input.value = '';
  }

  openFilePicker(input: HTMLInputElement): void {
    input.click();
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.clearMessages();
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file || this.isUploading()) {
      return;
    }

    const validationError = this.validateFile(file, this.activeFileTypeOption());
    if (validationError) {
      this.errorMessage.set(validationError);
      this.statusMessage.set('');
      return;
    }

    const uploaderId = this.currentAppUser.getUserId();
    if (!uploaderId) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      this.statusMessage.set('');
      return;
    }

    const asOfDate = this.asOfDate().trim();
    if (!asOfDate) {
      this.errorMessage.set('As of date is required.');
      this.statusMessage.set('');
      return;
    }

    const fileTypeOption = this.activeFileTypeOption();
    const storedFileName = this.buildStoredFileName(file.name, fileTypeOption);
    this.isUploading.set(true);
    this.statusMessage.set(`Uploading ${storedFileName}...`);
    this.errorMessage.set('');

    this.cmhcUploadApi
      .uploadFile(file, storedFileName, uploaderId, this.selectedFileType(), asOfDate)
      .subscribe({
        next: () => {
          this.selectedFile.set(null);
          this.statusMessage.set(
            `Your ${fileTypeOption.label} file ${storedFileName} for the period ${this.formatAsOfDateDisplay(asOfDate)} has been successfully uploaded and will be available in reporting within the next 2 hours.`,
          );
          this.isUploading.set(false);
          this.loadHistory();
        },
        error: (error) => {
          this.statusMessage.set('');
          const detail = this.extractBackendError(error);
          this.errorMessage.set(
            `Your ${fileTypeOption.label} file ${storedFileName} for the period ${this.formatAsOfDateDisplay(asOfDate)} has failed the upload validations noted below please review and re-submit or contact ITSupport@kingsettcapital.com for further assistance.\n\n${detail}`,
          );
          this.isUploading.set(false);
        },
      });
  }

  formatUploadedDate(value: string): string {
    return formatAuditModifiedDate(value);
  }

  historyRowTrackId(row: CmhcUploadHistoryRecord): string {
    return `${row.fileId}|${row.uploadedDate}|${row.filename}`;
  }

  formatFileTypeLabel(value: string | null | undefined, filename?: string): string {
    const normalized = (value ?? '').trim().toLowerCase();
    const match = this.fileTypeOptions.find((option) => option.value === normalized);
    if (match) {
      return match.label;
    }

    const name = (filename ?? '').toLowerCase();
    if (name.endsWith('.pdf')) {
      return this.fileTypeOptions.find((option) => option.value === 'qr-slides')?.label ?? 'QR slides (PDF)';
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) {
      return this.fileTypeOptions.find((option) => option.value === 'cmhc')?.label ?? 'CMHC (Excel)';
    }

    return normalized || '-';
  }

  formatAsOfDateDisplay(value: string): string {
    if (!value?.trim()) {
      return '-';
    }

    const trimmed = value.trim();
    const dateOnly = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
    const [year, month, day] = dateOnly.split('-');
    if (year?.length === 4 && month && day) {
      return `${month}/${day}/${year}`;
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  buildStoredFileName(originalName: string, option: FileUploadTypeOption): string {
    const trimmed = originalName.trim() || 'upload';
    const lastDot = trimmed.lastIndexOf('.');
    const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
    const ext = lastDot > 0 ? trimmed.slice(lastDot) : option.extensions[0];
    const stamp = this.formatTimestampForFileName(new Date());
    return `${base}_${stamp}${ext}`;
  }

  private setSelectedFile(file: File): void {
    const validationError = this.validateFile(file, this.activeFileTypeOption());
    if (validationError) {
      this.selectedFile.set(null);
      this.errorMessage.set(validationError);
      this.statusMessage.set('');
      return;
    }
    this.selectedFile.set(file);
    this.clearMessages();
    this.statusMessage.set(`Selected: ${file.name}. Click Upload to save.`);
  }

  private validateFile(file: File, option: FileUploadTypeOption): string | null {
    const name = file.name.toLowerCase();
    const isAllowedByExtension = option.extensions.some((ext) => name.endsWith(ext));
    const isAllowedByMime =
      option.mimeTypes.length > 0 && option.mimeTypes.includes(file.type.toLowerCase());

    if (!isAllowedByExtension && !isAllowedByMime) {
      return `Only ${option.label} files (${option.extensions.join(', ')}) are allowed.`;
    }
    return null;
  }

  private formatTimestampForFileName(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}${s}`;
  }

  /** Prefer API display name; legacy rows may still show system. */
  formatUploadedBy(record: CmhcUploadHistoryRecord | Record<string, unknown>): string {
    const row = record as Record<string, unknown>;
    const displayName = String(row['uploadedByName'] ?? row['uploaded_by_name'] ?? '').trim();
    if (displayName) {
      return displayName;
    }

    const raw = String(row['uploadedBy'] ?? row['uploaded_by'] ?? '').trim();
    if (!raw) {
      return '-';
    }
    if (raw.toLowerCase() === SYSTEM_USER_GUID) {
      return SYSTEM_USER_LABEL;
    }
    return raw;
  }

  /**
   * Upload History sort: Uploaded Date desc → File Type A–Z → As Of desc.
   */
  private compareUploadHistoryRows(a: CmhcUploadHistoryRecord, b: CmhcUploadHistoryRecord): number {
    const uploadedDiff =
      this.parseHistoryDateMs(b.uploadedDate) - this.parseHistoryDateMs(a.uploadedDate);
    if (uploadedDiff !== 0) {
      return uploadedDiff;
    }

    const typeA = this.formatFileTypeLabel(a.fileType, a.filename).toLocaleLowerCase();
    const typeB = this.formatFileTypeLabel(b.fileType, b.filename).toLocaleLowerCase();
    const typeDiff = typeA.localeCompare(typeB);
    if (typeDiff !== 0) {
      return typeDiff;
    }

    return this.parseHistoryDateMs(b.asOfDate) - this.parseHistoryDateMs(a.asOfDate);
  }

  private parseHistoryDateMs(value: string | null | undefined): number {
    if (!value?.trim()) {
      return 0;
    }

    const trimmed = value.trim();
    const dateOnly = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateOnly)) {
      const [year, month, day] = dateOnly.split('-').map(Number);
      const parsed = Date.UTC(year, (month ?? 1) - 1, day ?? 1);
      if (!Number.isNaN(parsed)) {
        // Prefer full timestamp when present (uploaded_date).
        const full = Date.parse(trimmed);
        return Number.isNaN(full) ? parsed : full;
      }
    }

    const ms = Date.parse(trimmed);
    return Number.isNaN(ms) ? 0 : ms;
  }

  private mapHistoryRecord(
    record: CmhcUploadHistoryRecord | Record<string, unknown>,
  ): CmhcUploadHistoryRecord {
    const row = record as Record<string, unknown>;
    const uploadedByName = this.formatUploadedBy(row);
    return {
      fileId: Number(row['fileId'] ?? row['file_id'] ?? 0),
      filename: String(row['filename'] ?? row['fileName'] ?? '').trim(),
      fileType: String(row['fileType'] ?? row['file_type'] ?? '').trim() || null,
      uploadedDate: String(row['uploadedDate'] ?? row['uploaded_date'] ?? ''),
      uploadedBy: uploadedByName,
      uploadedByUserId:
        row['uploadedByUserId'] != null || row['uploaded_by_user_id'] != null
          ? Number(row['uploadedByUserId'] ?? row['uploaded_by_user_id'])
          : null,
      uploadedByName,
      asOfDate: String(row['asOfDate'] ?? row['as_of_date'] ?? '').trim() || null,
    };
  }

  private loadHistory(): void {
    this.isLoadingHistory.set(true);

    this.cmhcUploadApi.getHistory().subscribe({
      next: (records) => {
        const sorted = records
          .map((record) => this.mapHistoryRecord(record))
          .filter((row) => row.fileId > 0 || row.filename.length > 0)
          .sort((a, b) => this.compareUploadHistoryRows(a, b));
        this.history.set(sorted);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.history.set([]);
        this.isLoadingHistory.set(false);
        if (!this.errorMessage()) {
          this.errorMessage.set('Unable to load upload history. Verify API availability.');
        }
      },
    });
  }

  private extractBackendError(error: unknown): string {
    const fallback = 'Failed to upload file.';
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as {
      status?: number;
      error?: { message?: string; title?: string; detail?: string } | string;
      message?: string;
    };

    if (maybeError.status === 413) {
      return 'File is too large. Maximum upload size is 60 MB.';
    }

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
    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }

    return fallback;
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }

  private todayIsoDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
