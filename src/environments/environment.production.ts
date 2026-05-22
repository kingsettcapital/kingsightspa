import type { Environment } from '../app/core/interfaces/environment.interfaces';

export const environment: Environment = {
  production: true,
  requireLogin: true,
  apiUrl: 'https://localhost:7140',
  azureConfig: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectURL: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200/auth/login',
    scopes: 'api://YOUR_API_APP_ID/.default',
  },
};
