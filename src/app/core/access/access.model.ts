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

/** Mortgage Approver may lock/unlock LTV and edit Current LTV when unlocked. */
export function isMortgageApproverRole(roleName: string | null | undefined): boolean {
  const normalized = (roleName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return normalized === 'mortgage approver';
}

/** Admin sees everything; Mortgage Approver may edit/lock LTV. Other roles are read-only. */
export function canEditLtvValidation(roleName: string | null | undefined): boolean {
  if (normalizeAppRole(roleName) === AppRole.Admin) {
    return true;
  }
  return isMortgageApproverRole(roleName);
}
