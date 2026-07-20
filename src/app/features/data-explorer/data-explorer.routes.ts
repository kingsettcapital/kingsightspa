import { Routes } from '@angular/router';

import { provideDataExplorerStore } from './store';

export const DATA_EXPLORER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./data-explorer/data-explorer.component').then(
        (m) => m.DataExplorerComponent,
      ),
    providers: [...provideDataExplorerStore()],
  },
];
