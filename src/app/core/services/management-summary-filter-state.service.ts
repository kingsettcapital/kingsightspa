import { DestroyRef, Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import type { ManagementSummaryFilters } from '../../pages/management-summary/management-summary.models';

function todayAsOfDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function createManagementSummaryDefaultFilters(): ManagementSummaryFilters {
  return {
    asOfDate: todayAsOfDate(),
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
 * First open → TODAY. Drill to loan detail and back → retained.
 * Leave /mortgage/management-summary* → cleared so the next open is TODAY again.
 */
@Injectable({ providedIn: 'root' })
export class ManagementSummaryFilterStateService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private sessionFilters: ManagementSummaryFilters | null = null;

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

  resetToDefaults(): ManagementSummaryFilters {
    this.sessionFilters = createManagementSummaryDefaultFilters();
    return this.getFilters();
  }

  clear(): void {
    this.sessionFilters = null;
  }

  private isManagementSummaryRoute(url: string): boolean {
    const path = url.split('?')[0];
    return path.startsWith('/mortgage/management-summary');
  }
}
