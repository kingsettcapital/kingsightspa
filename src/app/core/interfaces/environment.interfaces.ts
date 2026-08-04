import { UserRole } from '../enums/user-role.enum';

export interface AzureConfig {
  clientId: string;
  authority: string;
  redirectURL: string;
  /** Full URI, e.g. http://localhost:4200/auth/login — must be registered in Azure AD */
  postLogoutRedirectUri: string;
  scopes: string;
}

export interface Environment {
  production: boolean;
  requireLogin: boolean;
  apiUrl: string;
  azureConfig: AzureConfig;
  /** Dev fallback when the token has no role claim. */
  mockUserRole?: UserRole;
  /**
   * When false, Management Summary is hidden from everyone (nav + routes).
   * Set true when the page is ready for testing.
   */
  managementSummaryEnabled?: boolean;
}
