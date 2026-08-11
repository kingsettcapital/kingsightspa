import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import type { ManagementSummaryFilters } from '../../pages/management-summary/management-summary.models';
import {
  DEFAULT_FILTER_OPTIONS,
  type ManagementSummaryFilterOptions,
} from '../../pages/management-summary/management-summary-filter.util';

/** Report as-of defaults to yesterday (T-1). */
function defaultAsOfDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createManagementSummaryDefaultFilters(): ManagementSummaryFilters {
  return {
    asOfDate: defaultAsOfDate(),
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsor: 'All',
    riskLevels: ['ALL'],
    status: 'Default',
    investorAliases: ['All'],
  };
}

/**
 * Keeps Management Summary filters for the active report session.
 * First open → yesterday (T-1). Drill to loan detail and back → retained.
 * Leave /mortgage/management-summary* → cleared so the next open is T-1 again.
 */
@Injectable({ providedIn: 'root' })
export class ManagementSummaryFilterStateService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private sessionFilters: ManagementSummaryFilters | null = null;
  private sessionOptions: ManagementSummaryFilterOptions | null = null;

  constructor() {
    const sub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (!this.isManagementSummaryRoute(event.urlAfterRedirects)) {
          this.clear();
        }
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  getFilters(): ManagementSummaryFilters {
    if (!this.sessionFilters) {
      this.sessionFilters = createManagementSummaryDefaultFilters();
    }
    return {
      ...this.sessionFilters,
      riskLevels: [...this.sessionFilters.riskLevels],
      investorAliases: [...this.sessionFilters.investorAliases],
    };
  }

  saveFilters(filters: ManagementSummaryFilters): void {
    this.sessionFilters = {
      ...filters,
      riskLevels: [...filters.riskLevels],
      investorAliases: [...filters.investorAliases],
    };
  }

  getFilterOptions(): ManagementSummaryFilterOptions {
    const options = this.sessionOptions ?? DEFAULT_FILTER_OPTIONS;
    return {
      sponsors: [...options.sponsors],
      investorAliases: [...options.investorAliases],
      statuses: [...options.statuses],
    };
  }

  saveFilterOptions(options: ManagementSummaryFilterOptions): void {
    this.sessionOptions = {
      sponsors: [...options.sponsors],
      investorAliases: [...options.investorAliases],
      statuses: [...options.statuses],
    };
  }

  resetToDefaults(): ManagementSummaryFilters {
    this.sessionFilters = createManagementSummaryDefaultFilters();
    return this.getFilters();
  }

  clear(): void {
    this.sessionFilters = null;
    this.sessionOptions = null;
  }

  private isManagementSummaryRoute(url: string): boolean {
    const path = url.split('?')[0];
    return path.startsWith('/mortgage/management-summary');
  }
}
