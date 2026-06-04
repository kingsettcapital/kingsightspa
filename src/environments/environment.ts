import { UserRole } from '../app/core/enums/user-role.enum';
import type { Environment } from '../app/core/interfaces/environment.interfaces';

export const environment: Environment = {
  production: false,
  requireLogin: true,
  // apiUrl: 'http://localhost:7140/',
  apiUrl: 'https://kingsightdevapi.kingsettcapital.com/',
  mockUserRole: UserRole.Administrator,
  azureConfig: {
      clientId: 'cfb0f697-501d-4f4e-a200-04187704a1af',
   authority: 'https://login.microsoftonline.com/f6d94abc-5472-43af-ab66-95726e5ab0cc/',
    redirectURL: 'https://kingsightdev.kingsettcapital.com',
    postLogoutRedirectUri: 'http://kingsightdev.kingsettcapital.com/auth/login',  
    scopes: "api://444a5811-9469-445c-b83d-6f3c53328b10/Read"
  },
};
