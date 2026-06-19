import { InjectionToken } from '@angular/core';
/* test */

export type ApiConfig = {
  baseUrl: string;
  /** mort.CMHC_upload_historytbl.uploaded_by (UNIQUEIDENTIFIER) until auth is wired. */
  cmhcUploadedByUserId?: string;
};

/** Strip trailing slashes so `${baseUrl}/api/...` never produces `//`. */
export function normalizeApiBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const APP_API_CONFIG = new InjectionToken<ApiConfig>('APP_API_CONFIG');
