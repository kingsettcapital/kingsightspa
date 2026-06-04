import { UserRole } from '../app/core/enums/user-role.enum';
import type { Environment } from '../app/core/interfaces/environment.interfaces';

export const environment: Environment = {
  production: false,
  requireLogin: true,
  // apiUrl: 'http://localhost:7140/',
  apiUrl: 'https://kingsightdevapi.kingsettcapital.com/',
  mockUserRole: UserRole.Administrator,
  azureConfig: {
    clientId: 'c505fbcc-5f64-4025-bae9-bccb863c4728',
    authority: 'https://login.microsoftonline.com/f6d94abc-5472-43af-ab66-95726e5ab0cc/',
    redirectURL: 'http://kingsightdev.kingsettcapital.com',
    postLogoutRedirectUri: 'http://kingsightdev.kingsettcapital.com/auth/login',  
    scopes: 'api://4092694a-0ad6-4257-8cc5-719335557535/Read',
  },
};
