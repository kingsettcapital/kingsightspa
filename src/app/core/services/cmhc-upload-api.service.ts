import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

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

  uploadExcel(file: File, storedFileName: string, uploadedBy: string) {
    const formData = new FormData();
    formData.append('file', file, storedFileName);
    formData.append('fileName', storedFileName);
    formData.append('uploadedBy', uploadedBy);
    return this.http.post<CmhcUploadHistoryRecord>(this.baseUrl, formData);
  }
}
