import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'user-management',
  },
  {
    path: 'user-management',
    loadComponent: () =>
      import('../../pages/user-management/user-management.component').then(
        (m) => m.UserManagementComponent,
      ),
  },
];
