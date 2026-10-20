import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

/** Mirrors PropertyImageDto from GET /api/LoanAlias/{loanAliasId}/property-image/info */
export type PropertyImageInfo = {
  propertyImageId: number;
  loanAliasId: number;
  fileName: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedBy?: string | null;
  uploadedDate?: string | null;
};

export const PROPERTY_IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const PROPERTY_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const PROPERTY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

@Injectable({
  providedIn: 'root',
})
export class PropertyImageApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private url(loanAliasId: number): string {
    return `${this.apiConfig.baseUrl}/api/LoanAlias/${loanAliasId}/property-image`;
  }

  /** null body (204) when the loan alias has no image. */
  getInfo(loanAliasId: number) {
    return this.http.get<PropertyImageInfo | null>(`${this.url(loanAliasId)}/info`);
  }

  /** Fetched as a blob so the MSAL interceptor attaches the bearer token (a plain img src would 401). */
  getImageBlob(loanAliasId: number) {
    return this.http.get(this.url(loanAliasId), { responseType: 'blob' });
  }

  upload(loanAliasId: number, file: File, updatedBy: string) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('updatedBy', updatedBy);
    return this.http.post<PropertyImageInfo>(this.url(loanAliasId), formData);
  }

  remove(loanAliasId: number, updatedBy: string) {
    return this.http.delete<void>(this.url(loanAliasId), { params: { updatedBy } });
  }
}
