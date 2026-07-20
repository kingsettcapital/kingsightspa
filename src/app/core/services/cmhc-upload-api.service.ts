import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

export type FileUploadType = 'cmhc' | 'qr-slides';

export type FileUploadTypeOption = {
  value: FileUploadType;
  label: string;
  accept: string;
  extensions: string[];
  mimeTypes: string[];
  dropZoneHint: string;
};

export const FILE_UPLOAD_TYPE_OPTIONS: FileUploadTypeOption[] = [
  {
    value: 'cmhc',
    label: 'CMHC (Excel)',
    accept:
      '.xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
    extensions: ['.xlsx', '.xls', '.xlsm'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ],
    dropZoneHint: 'Choose Excel file to upload or drag & drop here',
  },
  {
    value: 'qr-slides',
    label: 'QR slides (PDF)',
    accept: '.pdf,application/pdf',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    dropZoneHint: 'Choose QR slides PDF to upload or drag & drop here',
  },
];

/**
 * Mirrors subjective_input.file_upload_history / CmhcUploadHistoryDto.
 * uploaded_by is UNIQUEIDENTIFIER in SQL (GUID string in JSON).
 */
export type CmhcUploadHistoryRecord = {
  fileId: number;
  filename: string;
  fileType?: string | null;
  uploadedDate: string;
  uploadedBy: string;
  uploadedByUserId?: number | null;
  uploadedByName?: string | null;
  asOfDate?: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class CmhcUploadApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/CmhcUpload`;
  }

  getHistory() {
    return this.http.get<CmhcUploadHistoryRecord[]>(`${this.baseUrl}/history`);
  }

  uploadFile(
    file: File,
    storedFileName: string,
    uploadedByUserId: number,
    fileType: FileUploadType,
    asOfDate: string,
  ) {
    const formData = new FormData();
    formData.append('file', file, storedFileName);
    formData.append('fileName', storedFileName);
    formData.append('uploadedByUserId', String(uploadedByUserId));
    formData.append('fileType', fileType);
    formData.append('asOfDate', asOfDate);

    const url = `${this.baseUrl}?fileType=${encodeURIComponent(fileType)}`;
    return this.http.post<CmhcUploadHistoryRecord>(url, formData);
  }
}
