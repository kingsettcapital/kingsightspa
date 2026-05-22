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
}
