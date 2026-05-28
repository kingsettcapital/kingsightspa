import { inject, Injectable, signal } from '@angular/core';
import {
  AccountInfo,
  AuthenticationResult,
  EventMessage,
  EventType,
  InteractionStatus,
} from '@azure/msal-browser';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { filter } from 'rxjs';

import {
  AUTH_LOGIN_ROUTE,
  LOGIN_FAILED_ROUTE,
  LOGGED_OUT_SESSION_KEY,
  loginRequest,
} from '../constants/auth.config';
import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../interfaces/auth.interfaces';
import { parseUserRole } from '../utils/user-role.util';
import {
  authError,
  authLog,
  authWarn,
  logAuthEnvironment,
  logUrlAuthParams,
} from '../utils/auth-logger.util';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly msalService = inject(MsalService);
  private readonly msalBroadcastService = inject(MsalBroadcastService);

  readonly requireLogin = environment.requireLogin;
  readonly isMsalReady = signal(false);
  readonly isRedirectInProgress = signal(false);
  readonly isAuthenticated = signal(false);
  readonly activeAccount = signal<AccountInfo | null>(null);
  readonly currentUser = signal<AuthUser | null>(null);

  private shouldSkipAutoLoginRedirect(): boolean {
    return (
      this.isLoginFailedRoute() ||
      this.isAuthLoginRoute() ||
      this.hasOAuthErrorInUrl() ||
      this.hasOAuthCodeInUrl()
    );
  }

  private isAuthLoginRoute(): boolean {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    return path === AUTH_LOGIN_ROUTE || path.endsWith(AUTH_LOGIN_ROUTE);
  }

  private hasOAuthCodeInUrl(): boolean {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const search = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search;
    return new URLSearchParams(hash || search).has('code');
  }

  private isLoginFailedRoute(): boolean {
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    return (
      path === LOGIN_FAILED_ROUTE || path.endsWith(LOGIN_FAILED_ROUTE)
    );
  }

  private hasOAuthErrorInUrl(): boolean {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const search = window.location.search.startsWith('?')
      ? window.location.search.slice(1)
      : window.location.search;
    return new URLSearchParams(hash || search).has('error');
  }

  async initialize(): Promise<void> {
    logAuthEnvironment();
    logUrlAuthParams();

    if (!this.requireLogin) {
      authLog('Login disabled (requireLogin=false)');
      this.isMsalReady.set(true);
      this.isRedirectInProgress.set(false);
      return;
    }

    this.isRedirectInProgress.set(true);
    authLog('Initializing MSAL…');

    try {
      await this.msalService.instance.initialize();
      authLog('MSAL instance initialized');

      const redirectResult =
        await this.msalService.instance.handleRedirectPromise();

      if (redirectResult) {
        authLog('Redirect handled', {
          account: redirectResult.account?.username,
          scopes: redirectResult.scopes,
          fromCache: redirectResult.fromCache,
        });
      } else {
        authLog('No redirect response (not returning from Azure login)');
      }

      const accounts = this.msalService.instance.getAllAccounts();
      const skipSessionRestore = this.shouldSkipSessionRestore();

      if (skipSessionRestore) {
        authLog('Explicit logout pending — not restoring cached session');
        await this.clearMsalCache();
        this.clearAuthState();
      } else if (redirectResult?.account) {
        this.clearLoggedOutFlag();
        this.setActiveAccount(redirectResult.account);
      } else if (accounts.length > 0) {
        await this.ensureActiveAccount();
      } else {
        this.clearAuthState();
      }

      this.listenToMsalEvents();
      this.updateAuthState();

      authLog('Auth state after init', {
        isAuthenticated: this.isAuthenticated(),
        accountCount: this.msalService.instance.getAllAccounts().length,
        activeAccount: this.msalService.instance.getActiveAccount()?.username,
      });

      if (this.isAuthenticated()) {
        authLog('Authenticated successfully');
      } else if (this.shouldSkipAutoLoginRedirect()) {
        authLog(
          'Not authenticated — skipping auto login (login-failed or OAuth redirect in progress)'
        );
      } else {
        authLog('Not authenticated — redirecting to Microsoft login');
        await this.loginRedirect(this.isExplicitLogoutPending());
        return;
      }
    } catch (error) {
      authError('MSAL initialization failed', error);
    } finally {
      this.isMsalReady.set(true);
      const loginRedirectPending =
        this.requireLogin &&
        !this.isAuthenticated() &&
        !this.shouldSkipAutoLoginRedirect();
      if (!loginRedirectPending) {
        this.isRedirectInProgress.set(false);
      }
      authLog('Initialize complete', {
        isMsalReady: this.isMsalReady(),
        isRedirectInProgress: this.isRedirectInProgress(),
        isAuthenticated: this.isAuthenticated(),
      });
    }
  }

  async loginRedirect(clearStaleState = false): Promise<void> {
    if (!this.requireLogin) {
      return;
    }

    this.clearLoggedOutFlag();

    if (clearStaleState) {
      await this.clearMsalCache();
    }

    this.isRedirectInProgress.set(true);

    authLog('Starting loginRedirect', {
      scopes: loginRequest.scopes,
      redirectUri: environment.azureConfig.redirectURL,
    });

    try {
      await this.msalService.loginRedirect({
        ...loginRequest,
        prompt: 'select_account',
      });
    } catch (error) {
      authError('loginRedirect failed', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (!this.requireLogin) {
      this.clearAuthState();
      return;
    }

    const account =
      this.msalService.instance.getActiveAccount() ??
      this.msalService.instance.getAllAccounts()[0] ??
      null;

    authLog('Logging out', { account: account?.username });
    this.markLoggedOut();
    this.clearAuthState();

    if (!account) {
      await this.clearMsalCache();
      window.location.replace(AUTH_LOGIN_ROUTE);
      return;
    }

    try {
      await this.msalService.logoutRedirect({
        account,
        postLogoutRedirectUri: environment.azureConfig.postLogoutRedirectUri,
        logoutHint: account.username,
      });
    } catch (error) {
      authError('logoutRedirect failed', error);
      await this.clearMsalCache(account);
      window.location.replace(AUTH_LOGIN_ROUTE);
      throw error;
    }
  }

  private async ensureActiveAccount(): Promise<void> {
    if (this.shouldSkipSessionRestore()) {
      return;
    }

    const accounts = this.msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      return;
    }

    if (!this.msalService.instance.getActiveAccount()) {
      this.setActiveAccount(accounts[0]);
    }

    try {
      await this.msalService.instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
    } catch (error) {
      authWarn('Silent token acquisition failed', error);
    }
  }

  private async clearMsalCache(account?: AccountInfo | null): Promise<void> {
    try {
      await this.msalService.instance.clearCache({ account: account ?? null });
      authLog('MSAL cache cleared', { account: account?.username ?? 'all' });
    } catch (error) {
      authWarn('MSAL clearCache failed, using storage fallback', error);
    }

    this.clearMsalStorageFallback();
    this.msalService.instance.setActiveAccount(null);
  }

  private clearMsalStorageFallback(): void {
    try {
      const removeKeys = (storage: Storage) => {
        Object.keys(storage)
          .filter(
            (key) =>
              key.startsWith('msal') || key.includes('interaction.status')
          )
          .forEach((key) => storage.removeItem(key));
      };

      removeKeys(localStorage);
      removeKeys(sessionStorage);
    } catch (error) {
      authError('Error clearing MSAL storage fallback', error);
    }
  }

  private listenToMsalEvents(): void {
    this.msalBroadcastService.inProgress$.subscribe((status) => {
      authLog('MSAL interaction status', status);
    });

    this.msalBroadcastService.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => {
        authLog('MSAL interaction finished');

        if (
          this.shouldSkipSessionRestore() ||
          this.msalService.instance.getAllAccounts().length === 0
        ) {
          this.clearAuthState();
        } else {
          this.ensureActiveAccountSync();
        }

        this.updateAuthState();
        this.isRedirectInProgress.set(false);
        authLog('Auth state after interaction', {
          isAuthenticated: this.isAuthenticated(),
          activeAccount: this.msalService.instance.getActiveAccount()?.username,
        });
      });

    this.msalBroadcastService.msalSubject$.subscribe((msg: EventMessage) => {
      authLog('MSAL event', {
        eventType: msg.eventType,
        interactionType: msg.interactionType,
        error: msg.error,
      });

      if (msg.eventType === EventType.LOGOUT_SUCCESS) {
        authLog('Logout success — clearing local session');
        this.markLoggedOut();
        this.clearAuthState();
        void this.clearMsalCache();
        return;
      }

      const isFailureEvent =
        msg.eventType === EventType.LOGIN_FAILURE ||
        msg.eventType === EventType.ACQUIRE_TOKEN_FAILURE ||
        msg.eventType === EventType.SSO_SILENT_FAILURE ||
        msg.eventType === EventType.LOGOUT_FAILURE;

      if (isFailureEvent || msg.error) {
        authError('MSAL failure', {
          eventType: msg.eventType,
          error: msg.error,
          payload: msg.payload,
        });
      }
    });

    this.msalBroadcastService.msalSubject$
      .pipe(
        filter(
          (msg: EventMessage) =>
            msg.eventType === EventType.LOGIN_SUCCESS ||
            msg.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
            msg.eventType === EventType.SSO_SILENT_SUCCESS
        )
      )
      .subscribe((msg: EventMessage) => {
        const result = msg.payload as AuthenticationResult;
        authLog('MSAL success event', {
          eventType: msg.eventType,
          account: result?.account?.username,
        });
        if (result?.account) {
          this.clearLoggedOutFlag();
          this.setActiveAccount(result.account);
          this.updateAuthState();
        }
      });
  }

  private shouldSkipSessionRestore(): boolean {
    return (
      this.isExplicitLogoutPending() || this.shouldSkipAutoLoginRedirect()
    );
  }

  private isExplicitLogoutPending(): boolean {
    return sessionStorage.getItem(LOGGED_OUT_SESSION_KEY) === 'true';
  }

  private markLoggedOut(): void {
    sessionStorage.setItem(LOGGED_OUT_SESSION_KEY, 'true');
  }

  private clearLoggedOutFlag(): void {
    sessionStorage.removeItem(LOGGED_OUT_SESSION_KEY);
  }

  private ensureActiveAccountSync(): void {
    if (this.shouldSkipSessionRestore()) {
      return;
    }
    const accounts = this.msalService.instance.getAllAccounts();
    if (
      accounts.length > 0 &&
      !this.msalService.instance.getActiveAccount()
    ) {
      this.setActiveAccount(accounts[0]);
    }
  }

  private setActiveAccount(account: AccountInfo): void {
    this.msalService.instance.setActiveAccount(account);
    this.activeAccount.set(account);
  }

  private updateAuthState(): void {
    const account = this.msalService.instance.getActiveAccount();
    const authenticated = !!account;

    this.isAuthenticated.set(authenticated);
    this.activeAccount.set(account ?? null);

    if (account) {
      this.currentUser.set({
        name: account.name ?? account.username,
        email: account.username,
        username: account.username,
        role: this.resolveUserRole(account),
      });
    } else {
      this.currentUser.set(null);
    }
  }

  private resolveUserRole(account: AccountInfo): UserRole {
    const claims = account.idTokenClaims as Record<string, unknown> | undefined;
    const roles = claims?.['roles'];
    if (Array.isArray(roles) && typeof roles[0] === 'string') {
      return parseUserRole(roles[0]);
    }
    if (typeof claims?.['role'] === 'string') {
      return parseUserRole(claims['role']);
    }
    return environment.mockUserRole ?? UserRole.User;
  }

  private clearAuthState(): void {
    this.isAuthenticated.set(false);
    this.activeAccount.set(null);
    this.currentUser.set(null);
  }
}
