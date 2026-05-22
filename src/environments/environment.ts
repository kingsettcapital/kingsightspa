import type { Environment } from '../app/core/interfaces/environment.interfaces';

export const environment: Environment = {
  production: false,
  requireLogin: true,
  apiUrl: 'https://22e1-223-178-211-208.ngrok-free.app',
  azureConfig: {
    clientId: 'e32db1db-4cd9-4853-aa46-69cd1d63f8d7',
    authority: 'https://login.microsoftonline.com/f6d94abc-5472-43af-ab66-95726e5ab0cc',
    redirectURL: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200/auth/login',
    scopes: 'api://367f65c5-e761-4739-897a-cff602cb119d/.default',
  },
};
