/** Canonical roles used for the Admin vs Kingsett User gate. */
export enum AppRole {
  Admin = 'admin',
  KingsettUser = 'KingsettUser',
  Other = 'Other',
}

function normalizeRoleLabel(roleName: string | null | undefined): string {
  return (roleName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Admin detection — aligned with API IsAdminRole (admin, administrator, * admin, etc.).
 * Admin bypasses all mortgage role restrictions.
 */
export function isAdminRole(roleName: string | null | undefined): boolean {
  const normalized = normalizeRoleLabel(roleName);
  if (!normalized) {
    return false;
  }
  if (normalized === 'admin' || normalized === 'administrator') {
    return true;
  }
  return (
    normalized.endsWith(' admin') ||
    normalized.startsWith('admin ') ||
    normalized.includes('administrator')
  );
}

/** Normalize DB / UI role names (handles Administrator → admin, Kingset vs KingSett). */
export function normalizeAppRole(roleName: string | null | undefined): AppRole {
  if (isAdminRole(roleName)) {
    return AppRole.Admin;
  }

  const normalized = normalizeRoleLabel(roleName);

  if (!normalized) {
    return AppRole.Other;
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

/** Mortgage User — LTV Validation is read-only for this role (Admin exempt). */
export function isMortgageUserRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage user';
}

/** Mortgage Super User — may edit Loan/Investor Alias Assignment (Admin exempt). */
export function isMortgageSuperUserRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage super user';
}

/**
 * LTV Validation: editable for every role except Mortgage User.
 * Admin always has full access. No role loaded yet → deny edit.
 */
export function canEditLtvValidation(roleName: string | null | undefined): boolean {
  if (isAdminRole(roleName)) {
    return true;
  }
  if (!roleName?.trim()) {
    return false;
  }
  return !isMortgageUserRole(roleName);
}

/**
 * Loan Alias Assignment / Investor Alias Assignment:
 * editable for Mortgage Super User; Admin has full access.
 */
export function canEditAliasAssignment(roleName: string | null | undefined): boolean {
  if (isAdminRole(roleName)) {
    return true;
  }
  return isMortgageSuperUserRole(roleName);
}
