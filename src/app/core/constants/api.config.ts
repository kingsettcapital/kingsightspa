import { InjectionToken } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
  /** mort.CMHC_upload_historytbl.uploaded_by (UNIQUEIDENTIFIER) until auth is wired. */
  cmhcUploadedByUserId?: string;
};

export const APP_API_CONFIG = new InjectionToken<ApiConfig>('APP_API_CONFIG');
