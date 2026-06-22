import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { APP_API_CONFIG } from '../../core/constants/api.config';
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
  private readonly apiConfig = inject(APP_API_CONFIG);

  readonly fileTypeOptions = FILE_UPLOAD_TYPE_OPTIONS;
  readonly selectedFileType = signal<FileUploadType>('cmhc');
  readonly history = signal<CmhcUploadHistoryRecord[]>([]);
  readonly selectedFile = signal<File | null>(null);
  readonly isDragOver = signal(false);
  readonly isLoadingHistory = signal(false);
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

    const storedFileName = this.buildStoredFileName(file.name, this.activeFileTypeOption());
    this.isUploading.set(true);
    this.statusMessage.set(`Uploading ${storedFileName}...`);
    this.errorMessage.set('');

    this.cmhcUploadApi
      .uploadFile(file, storedFileName, this.resolveUploadedByUserId(), this.selectedFileType())
      .subscribe({
        next: () => {
          this.selectedFile.set(null);
          this.statusMessage.set(`File uploaded successfully as ${storedFileName}.`);
          this.isUploading.set(false);
          this.loadHistory();
        },
        error: (error) => {
          this.statusMessage.set('');
          this.errorMessage.set(this.extractBackendError(error));
          this.isUploading.set(false);
        },
      });
  }

  /** mort.CMHC_upload_historytbl.uploaded_by — UNIQUEIDENTIFIER sent to API. */
  private resolveUploadedByUserId(): string {
    const configured = this.apiConfig.cmhcUploadedByUserId?.trim();
    if (configured && this.isGuid(configured)) {
      return configured;
    }
    return SYSTEM_USER_GUID;
  }

  private isGuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  formatUploadedDate(value: string): string {
    if (!value?.trim()) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
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

  /** Grid label — matches Investor/Loan screens ("system") when placeholder GUID is used. */
  formatUploadedBy(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return '-';
    }
    if (raw.toLowerCase() === SYSTEM_USER_GUID) {
      return SYSTEM_USER_LABEL;
    }
    return raw;
  }

  private mapHistoryRecord(
    record: CmhcUploadHistoryRecord | Record<string, unknown>,
  ): CmhcUploadHistoryRecord {
    const row = record as Record<string, unknown>;
    return {
      fileId: Number(row['fileId'] ?? row['file_id'] ?? 0),
      filename: String(row['filename'] ?? row['fileName'] ?? '').trim(),
      uploadedDate: String(row['uploadedDate'] ?? row['uploaded_date'] ?? ''),
      uploadedBy: this.formatUploadedBy(row['uploadedBy'] ?? row['uploaded_by']),
    };
  }

  private loadHistory(): void {
    this.isLoadingHistory.set(true);

    this.cmhcUploadApi.getHistory().subscribe({
      next: (records) => {
        const sorted = records
          .map((record) => this.mapHistoryRecord(record))
          .filter((row) => row.fileId > 0 || row.filename.length > 0)
          .sort(
            (a, b) =>
              new Date(b.uploadedDate).getTime() - new Date(a.uploadedDate).getTime(),
          );
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
}
