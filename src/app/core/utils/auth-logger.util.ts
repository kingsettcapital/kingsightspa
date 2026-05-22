import { environment } from '../../../environments/environment';

const PREFIX = '[Auth]';

export function authLog(message: string, ...args: unknown[]): void {
  console.log(`${PREFIX} ${message}`, ...args);
}

export function authWarn(message: string, ...args: unknown[]): void {
  console.warn(`${PREFIX} ${message}`, ...args);
}

export function authError(message: string, ...args: unknown[]): void {
  console.error(`${PREFIX} ${message}`, ...args);
}

export function logAuthEnvironment(): void {
  authLog('Active environment', {
    production: environment.production,
    requireLogin: environment.requireLogin,
    apiUrl: environment.apiUrl,
    redirectURL: environment.azureConfig.redirectURL,
    authority: environment.azureConfig.authority,
    clientId: environment.azureConfig.clientId,
    scopes: environment.azureConfig.scopes,
  });
}

export function logUrlAuthParams(): void {
  const { href, hash, search } = window.location;
  if (!hash && !search) {
    return;
  }

  authLog('URL params (hash/search)', { href, hash, search });

  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(
    search.startsWith('?') ? search.slice(1) : search
  );

  const error = hashParams.get('error') ?? searchParams.get('error');
  const errorDescription =
    hashParams.get('error_description') ?? searchParams.get('error_description');
  const state = hashParams.get('state') ?? searchParams.get('state');
  const code = hashParams.get('code') ?? searchParams.get('code');

  if (error || errorDescription) {
    authError('OAuth error in URL', {
      error,
      errorDescription: errorDescription?.replace(/\+/g, ' '),
      state,
    });
    return;
  }

  if (code) {
    authLog('OAuth redirect success (authorization code in URL)', { state });
  }
}
