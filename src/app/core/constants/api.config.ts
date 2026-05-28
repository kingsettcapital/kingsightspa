import { InjectionToken } from '@angular/core';

export type ApiConfig = {
  baseUrl: string;
};

export const APP_API_CONFIG = new InjectionToken<ApiConfig>('APP_API_CONFIG');
