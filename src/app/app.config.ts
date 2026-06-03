import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { APP_API_CONFIG } from './core/config/api.config';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    {
      provide: APP_API_CONFIG,
      useValue: {
        baseUrl: 'https://localhost:7140',
        // Placeholder GUID for "system" until auth is wired (displayed as "system" in the grid).
        cmhcUploadedByUserId: '00000000-0000-0000-0000-000000000000',
      },
    },
  ]
};
