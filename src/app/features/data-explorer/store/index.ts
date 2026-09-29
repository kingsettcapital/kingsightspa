import { EnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { DataExplorerEffects } from './data-explorer.effects';
import { dataExplorerFeature } from './data-explorer.reducer';

export function provideDataExplorerStore(): EnvironmentProviders[] {
  return [provideState(dataExplorerFeature), provideEffects(DataExplorerEffects)];
}

export * from './data-explorer.actions';
export * from './data-explorer.selectors';
export * from './data-explorer.state';
