import { Routes } from '@angular/router';

import { userManagementGuard } from '../../core/access/access.guards';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'user-management',
  },
  {
    path: 'user-management',
    canActivate: [userManagementGuard],
    loadComponent: () =>
      import('../../pages/user-management/user-management.component').then(
        (m) => m.UserManagementComponent,
      ),
  },
];
