import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  MsalBroadcastService,
  MsalGuard,
  MsalInterceptor,
  MsalService,
} from '@azure/msal-angular';

import { APP_API_CONFIG, normalizeApiBaseUrl } from './core/constants/api.config';
import { provideAppStore } from './core/store/app.store';
import { msalProviders } from './core/factories/msal.factory';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAnimations(),
    provideRouter(routes),
    ...provideAppStore(),
    provideHttpClient(withInterceptorsFromDi(), withInterceptors([errorInterceptor])),
    ...(environment.requireLogin
      ? [
          {
            provide: HTTP_INTERCEPTORS,
            useClass: MsalInterceptor,
            multi: true,
          },
        ]
      : []),
    ...msalProviders,
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    AuthService,
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return authService.initialize();
    }),
    {
      provide: APP_API_CONFIG,
      useValue: {
        baseUrl: normalizeApiBaseUrl(environment.apiUrl),
      },
    },
  ],
};
