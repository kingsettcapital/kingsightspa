import { EnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { CapitalDashboardEffects } from './capital-dashboard.effects';
import { capitalDashboardFeature } from './capital-dashboard.reducer';

export function provideCapitalDashboardStore(): EnvironmentProviders[] {
  return [provideState(capitalDashboardFeature), provideEffects(CapitalDashboardEffects)];
}

export * from './capital-dashboard.actions';
export * from './capital-dashboard.selectors';
export * from './capital-dashboard.state';
