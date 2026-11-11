import { computed, inject, Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MORTGAGE_DEFAULT_ROUTE } from '../../features/mortgage/mortgage-nav.config';
import { AuthService } from '../services/auth.service';
import { CurrentAppUserService } from '../services/current-app-user.service';
import {
  AppRole,
  AppSection,
  displayAppRole,
  canEditAliasAssignment,
  canEditLtvValidation,
  isAdminRole,
  normalizeAppRole,
  sectionsForRole,
} from './access.model';

/** Where each section lands, in the order a user's default landing page is picked. */
const SECTION_LANDING_ROUTES: readonly [AppSection, string][] = [
  ['capital', '/capital-dashboard'],
  ['cmhc', '/cmhc-dashboard'],
  ['mortgage', `/mortgage/${MORTGAGE_DEFAULT_ROUTE}`],
  ['dataExplorer', '/data-explorer'],
  ['home', '/'],
];

export const NO_ACCESS_ROUTE = '/no-access';

/**
 * App access by role (see sectionsForRole in access.model.ts):
 * - admin → entire app including User Management
 * - Mortgage roles → Mortgage; Capital User → Capital + Data Explorer; CMHC → CMHC Dashboard
 * - Env feature flags still apply on top (admins bypass them, except showMortgage)
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly authService = inject(AuthService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly isLoading = this.currentAppUser.isLoading;
  readonly appUser = this.currentAppUser.user;

  /** True once the signed-in user's role lookup has finished (found or not). */
  readonly isReady = computed(() => {
    if (this.currentAppUser.isLoading()) {
      return false;
    }
    const email = this.authService.currentUser()?.email?.trim().toLowerCase() ?? '';
    if (!email) {
      return !environment.requireLogin;
    }
    return this.currentAppUser.resolvedEmail() === email;
  });

  readonly appRole = computed(() => {
    const user = this.appUser();
    if (!user || !user.isActive) {
      return AppRole.Other;
    }
    return normalizeAppRole(user.roleName);
  });

  readonly roleLabel = computed(() => displayAppRole(this.appRole(), this.appUser()?.roleName));

  readonly isAdmin = computed(() => {
    const user = this.appUser();
    return !!user?.isActive && isAdminRole(user.roleName);
  });

  /** Sections the active user's role allows, before env feature flags. */
  private readonly roleSections = computed<readonly AppSection[]>(() => {
    const user = this.appUser();
    return user?.isActive ? sectionsForRole(user.roleName) : [];
  });

  /** LTV Validation: all roles except Mortgage User; Admin has full access. */
  readonly canEditLtvValidation = computed(() => {
    if (this.isAdmin()) {
      return true;
    }
    return canEditLtvValidation(this.appUser()?.roleName);
  });

  /** Loan / Investor Alias Assignment: Mortgage Super User; Admin has full access. */
  readonly canEditAliasAssignment = computed(() => {
    if (this.isAdmin()) {
      return true;
    }
    return canEditAliasAssignment(this.appUser()?.roleName);
  });

  /** Role allows the section and its env feature flag (if any) is on. */
  canAccessSection(section: AppSection): boolean {
    if (!this.roleSections().includes(section)) {
      return false;
    }
    switch (section) {
      case 'home':
      case 'capital':
      case 'cmhc':
      case 'dataExplorer':
        return this.isFeatureVisible(environment.showHomeCapitalAndDataExplorer);
      case 'mortgage':
        return environment.showMortgage !== false;
      default:
        return true;
    }
  }

  /** Only active admin (user_master) may open User Management. */
  canAccessUserManagement(): boolean {
    return this.canAccessSection('userManagement');
  }

  /** First section the user may open, or the no-access page. */
  defaultRoute(): string {
    const landing = SECTION_LANDING_ROUTES.find(([section]) => this.canAccessSection(section));
    return landing ? landing[1] : NO_ACCESS_ROUTE;
  }

  /**
   * Env feature flags stay as configured for non-admins.
   * Admins bypass the flag so they can still open "hidden" sections in UAT/staging.
   */
  isFeatureVisible(flagEnabled: boolean | undefined): boolean {
    return flagEnabled === true || this.isAdmin();
  }
}
