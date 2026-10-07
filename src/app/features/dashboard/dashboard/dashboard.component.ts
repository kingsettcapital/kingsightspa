import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import {
  isAdminRole,
  isMortgageApproverRole,
  isMortgageSuperUserRole,
  isMortgageUserRole,
} from '../../../core/access/access.model';
import { CurrentAppUserService } from '../../../core/services/current-app-user.service';
import { MORTGAGE_DEFAULT_ROUTE, MORTGAGE_NAV_ITEMS } from '../../mortgage/mortgage-nav.config';

const LATE_INTEREST_BUSINESS_DAYS = 5;

/** Adds Mon–Fri business days (no holiday calendar). */
function addBusinessDays(start: Date, businessDays: number): Date {
  const result = new Date(start);
  let remaining = businessDays;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  return result;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly currentAppUser = inject(CurrentAppUserService);

  /** Placeholder Home cards — kept in template, gated by env flag. */
  readonly showHomeCapitalAndDataExplorer =
    environment.showHomeCapitalAndDataExplorer === true;

  readonly mortgageHomePath = `/mortgage/${MORTGAGE_DEFAULT_ROUTE}`;

  readonly mortgageLinks = MORTGAGE_NAV_ITEMS.filter(
    (item) =>
      item.path !== 'management-summary' || environment.managementSummaryEnabled === true,
  );

  /** Shown from the 1st of the month through the 1st + 5 business days, to Mortgage groups only. */
  readonly lateInterestWarning = computed(() => {
    const roleName = this.currentAppUser.user()?.roleName;
    if (
      !isAdminRole(roleName) &&
      !isMortgageSuperUserRole(roleName) &&
      !isMortgageApproverRole(roleName) &&
      !isMortgageUserRole(roleName)
    ) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const availableOn = addBusinessDays(monthStart, LATE_INTEREST_BUSINESS_DAYS);
    if (today > availableOn) {
      return null;
    }

    const priorMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const priorLabel = `${priorMonth.toLocaleString('en-US', { month: 'short' })}-${priorMonth.getFullYear()}`;
    const availableLabel = availableOn.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `Late Interest Calculation for the month of ${priorLabel} will only be available on ${availableLabel}.`;
  });
}
