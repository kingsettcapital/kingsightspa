import { EnvironmentProviders, isDevMode } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { environment } from '../../../environments/environment';

/** Root NgRx providers — feature states are registered per route. */
export function provideAppStore(): EnvironmentProviders[] {
  return [
    provideStore(),
    provideEffects(),
    ...(!environment.production
      ? [
          provideStoreDevtools({
            maxAge: 50,
            logOnly: !isDevMode(),
            connectInZone: true,
          }),
        ]
      : []),
  ];
}
