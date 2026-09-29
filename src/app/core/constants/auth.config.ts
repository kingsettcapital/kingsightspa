import {
  BrowserCacheLocation,
  Configuration,
  LogLevel,
} from '@azure/msal-browser';

import { environment } from '../../../environments/environment';
import { normalizeApiBaseUrl } from './api.config';

const isIE =
  window.navigator.userAgent.indexOf('MSIE') > -1 ||
  window.navigator.userAgent.indexOf('Trident/') > -1;

export const msalConfig: Configuration = {
  auth: {
    clientId: environment.azureConfig.clientId,
    authority: environment.azureConfig.authority,
    redirectUri: environment.azureConfig.redirectURL,
    // postLogoutRedirectUri: environment.azureConfig.postLogoutRedirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: isIE,
  },
  system: {
    loggerOptions: {
      loggerCallback(logLevel, message, containsPii) {
        if (containsPii) {
          return;
        }
        const prefixed = `[MSAL] ${message}`;
        if (logLevel === LogLevel.Error) {
          console.error(prefixed);
        } else if (logLevel === LogLevel.Warning) {
          console.warn(prefixed);
        } else {
          console.log(prefixed);
        }
      },
      logLevel: LogLevel.Verbose,
      piiLoggingEnabled: false,
    },
  },
};

export const LOGIN_FAILED_ROUTE = '/login-failed';
export const AUTH_LOGIN_ROUTE = '/auth/login';

/** Set after explicit logout; blocks silent re-login until user signs in again */
export const LOGGED_OUT_SESSION_KEY = 'auth.logged_out';

export const loginRequest = {
  scopes: [environment.azureConfig.scopes],
};

export const protectedResources = {
  loginApi: {
    endpoint: normalizeApiBaseUrl(environment.apiUrl),
    scopes: [environment.azureConfig.scopes],
  },
};
