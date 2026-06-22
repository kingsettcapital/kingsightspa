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
 * Mirrors mort.CMHC_upload_historytbl / CmhcUploadHistoryDto.
 * uploaded_by is UNIQUEIDENTIFIER in SQL (GUID string in JSON).
 */
export type CmhcUploadHistoryRecord = {
  fileId: number;
  filename: string;
  uploadedDate: string;
  uploadedBy: string;
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

  uploadFile(file: File, storedFileName: string, uploadedBy: string, fileType: FileUploadType) {
    const formData = new FormData();
    formData.append('file', file, storedFileName);
    formData.append('fileName', storedFileName);
    formData.append('uploadedBy', uploadedBy);
    formData.append('fileType', fileType);

    const url = `${this.baseUrl}?fileType=${encodeURIComponent(fileType)}`;
    return this.http.post<CmhcUploadHistoryRecord>(url, formData);
  }
}
