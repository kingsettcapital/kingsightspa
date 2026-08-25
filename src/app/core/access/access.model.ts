/** Canonical roles used for the Admin vs Kingsett User gate. */
export enum AppRole {
  Admin = 'admin',
  KingsettUser = 'KingsettUser',
  Other = 'Other',
}

/** Normalize DB / UI role names (handles Administrator → admin, Kingset vs KingSett). */
export function normalizeAppRole(roleName: string | null | undefined): AppRole {
  const normalized = (roleName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return AppRole.Other;
  }
  if (normalized === 'admin' || normalized === 'administrator') {
    return AppRole.Admin;
  }
  if (
    normalized === 'kingsett user' ||
    normalized === 'kingset user' ||
    normalized === 'kingssett user' ||
    normalized === 'king sett user'
  ) {
    return AppRole.KingsettUser;
  }
  return AppRole.Other;
}

export function displayAppRole(role: AppRole, fallbackName?: string | null): string {
  switch (role) {
    case AppRole.Admin:
      return 'admin';
    case AppRole.KingsettUser:
      return 'Kingsett User';
    default:
      return fallbackName?.trim() || 'User';
  }
}

function normalizeRoleLabel(roleName: string | null | undefined): string {
  return (roleName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Mortgage User — LTV Validation is read-only for this role. */
export function isMortgageUserRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage user';
}

/** Mortgage Super User — only role that may edit Loan/Investor Alias Assignment. */
export function isMortgageSuperUserRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage super user';
}

/**
 * LTV Validation: editable for every role except Mortgage User.
 * No role loaded yet → deny edit (avoid flash of editable UI).
 */
export function canEditLtvValidation(roleName: string | null | undefined): boolean {
  if (!roleName?.trim()) {
    return false;
  }
  return !isMortgageUserRole(roleName);
}

/**
 * Loan Alias Assignment / Investor Alias Assignment:
 * editable only for Mortgage Super User.
 */
export function canEditAliasAssignment(roleName: string | null | undefined): boolean {
  return isMortgageSuperUserRole(roleName);
}
