import type { Environment } from '../app/core/interfaces/environment.interfaces';

export const environment: Environment = {
  production: false,
  requireLogin: true,
  apiUrl: 'https://kingsightuatapi.kingsettcapital.com/',
  managementSummaryEnabled: true,
  showHomeCapitalAndDataExplorer: true,
  showAiAssistant: false, // UAT only
  showUserManagement: false, // UAT only
  azureConfig: {
    clientId: 'e32db1db-4cd9-4853-aa46-69cd1d63f8d7',
    authority: 'https://login.microsoftonline.com/f6d94abc-5472-43af-ab66-95726e5ab0cc',
    redirectURL: 'https://kingsightuat.kingsettcapital.com/',
    postLogoutRedirectUri: 'https://kingsightuat.kingsettcapital.com/auth/login',
    scopes: 'api://367f65c5-e761-4739-897a-cff602cb119d/Read',
  },
};
