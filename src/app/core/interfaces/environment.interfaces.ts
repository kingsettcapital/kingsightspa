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
  /**
   * When false, Home / Capital / Data Explorer nav and dashboard placeholder cards are hidden.
   * Feature routes and components remain in the codebase.
   */
  showHomeCapitalAndDataExplorer?: boolean;
  /**
   * When false, AI Assistant button and chat sidebar are hidden.
   * The AI chat component remains in the codebase.
   */
  showAiAssistant?: boolean;
  /**
   * When false, User Management nav is hidden.
   * Admin routes/components remain in the codebase.
   */
  showUserManagement?: boolean;
}
