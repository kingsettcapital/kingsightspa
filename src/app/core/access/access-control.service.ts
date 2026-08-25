import { computed, inject, Injectable } from '@angular/core';

import { CurrentAppUserService } from '../services/current-app-user.service';
import {
  AppRole,
  displayAppRole,
  canEditAliasAssignment,
  canEditLtvValidation,
  normalizeAppRole,
} from './access.model';

/**
 * App access for now:
 * - admin → entire app including User Management
 * - Kingsett User → entire app except User Management
 * - Other roles → same as Kingsett User (no User Management) until matrix work resumes
 */
@Injectable({ providedIn: 'root' })
export class AccessControlService {
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly isLoading = this.currentAppUser.isLoading;
  readonly appUser = this.currentAppUser.user;

  readonly appRole = computed(() => {
    const user = this.appUser();
    if (!user || !user.isActive) {
      return AppRole.Other;
    }
    return normalizeAppRole(user.roleName);
  });

  readonly roleLabel = computed(() => displayAppRole(this.appRole(), this.appUser()?.roleName));

  readonly isAdmin = computed(() => this.appRole() === AppRole.Admin);

  /** LTV Validation: all roles except Mortgage User. */
  readonly canEditLtvValidation = computed(() => canEditLtvValidation(this.appUser()?.roleName));

  /** Loan / Investor Alias Assignment: Mortgage Super User only. */
  readonly canEditAliasAssignment = computed(() =>
    canEditAliasAssignment(this.appUser()?.roleName),
  );

  /** Only active admin (user_master) may open User Management. */
  canAccessUserManagement(): boolean {
    return this.isAdmin();
  }

  /**
   * Env feature flags stay as configured for non-admins.
   * Admins bypass the flag so they can still open "hidden" sections in UAT/staging.
   */
  isFeatureVisible(flagEnabled: boolean | undefined): boolean {
    return flagEnabled === true || this.isAdmin();
  }
}
