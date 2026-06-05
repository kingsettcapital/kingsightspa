import { Routes } from '@angular/router';

export const DATA_EXPLORER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./data-explorer/data-explorer.component').then(
        (m) => m.DataExplorerComponent,
      ),
  },
];
