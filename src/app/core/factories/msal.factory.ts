import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalGuardConfiguration,
  MsalInterceptorConfiguration,
} from '@azure/msal-angular';
import {
  InteractionType,
  IPublicClientApplication,
  PublicClientApplication,
} from '@azure/msal-browser';

import { environment } from '../../../environments/environment';
import {
  LOGIN_FAILED_ROUTE,
  loginRequest,
  msalConfig,
  protectedResources,
} from '../constants/auth.config';

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(msalConfig);
}

export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: loginRequest,
    // loginFailedRoute: LOGIN_FAILED_ROUTE,
  };
}

export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, string[]>();

  if (environment.requireLogin) {
    protectedResourceMap.set(
      protectedResources.loginApi.endpoint,
      protectedResources.loginApi.scopes,
    );
  }

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

export const msalProviders = [
  {
    provide: MSAL_INSTANCE,
    useFactory: msalInstanceFactory,
  },
  {
    provide: MSAL_GUARD_CONFIG,
    useFactory: msalGuardConfigFactory,
  },
  {
    provide: MSAL_INTERCEPTOR_CONFIG,
    useFactory: msalInterceptorConfigFactory,
  },
];
