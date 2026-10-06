import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import type { ManagementSummaryFilters } from '../../pages/management-summary/management-summary.models';
import {
  DEFAULT_FILTER_OPTIONS,
  type ManagementSummaryFilterOptions,
} from '../../pages/management-summary/management-summary-filter.util';

/** Report as-of defaults to prior month-end: STARTOFMONTH(TODAY()) - 1. */
function defaultAsOfDate(): string {
  const today = new Date();
  // Day 0 of current month = last calendar day of prior month (local).
  const priorMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const year = priorMonthEnd.getFullYear();
  const month = String(priorMonthEnd.getMonth() + 1).padStart(2, '0');
  const day = String(priorMonthEnd.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createManagementSummaryDefaultFilters(): ManagementSummaryFilters {
  return {
    asOfDate: defaultAsOfDate(),
    defaultDateFrom: '',
    defaultDateTo: '',
    maturityDateFrom: '',
    maturityDateTo: '',
    sponsors: ['All'],
    riskLevels: ['ALL'],
    statuses: ['Default'],
    investorAliases: ['All'],
  };
}

function copyFilters(filters: ManagementSummaryFilters): ManagementSummaryFilters {
  return {
    ...filters,
    sponsors: [...filters.sponsors],
    riskLevels: [...filters.riskLevels],
    statuses: [...filters.statuses],
    investorAliases: [...filters.investorAliases],
  };
}

/**
 * Keeps Management Summary filters for the active report session.
 * First open → prior month-end. Drill to loan detail → MS filters stay here;
 * Loan Detail uses its own local filters (As Of only carried over).
 * Back to MS → prior MS filters restored from this session.
 * Leave /mortgage/management-summary* → cleared so the next open redefaults.
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
    return copyFilters(this.sessionFilters);
  }

  saveFilters(filters: ManagementSummaryFilters): void {
    this.sessionFilters = copyFilters(filters);
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
