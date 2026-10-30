import { Routes } from '@angular/router';

import { dataExplorerGuard } from '../../core/access/access.guards';
import { provideDataExplorerStore } from './store';

export const DATA_EXPLORER_ROUTES: Routes = [
  {
    path: '',
    canActivate: [dataExplorerGuard],
    loadComponent: () =>
      import('./data-explorer/data-explorer.component').then(
        (m) => m.DataExplorerComponent,
      ),
    providers: [...provideDataExplorerStore()],
  },
];
