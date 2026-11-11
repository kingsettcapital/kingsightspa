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

/** Top-level areas of the app that can be shown or hidden per role. */
export type AppSection = 'home' | 'capital' | 'cmhc' | 'mortgage' | 'dataExplorer' | 'userManagement';

const ALL_SECTIONS: readonly AppSection[] = [
  'home',
  'capital',
  'cmhc',
  'mortgage',
  'dataExplorer',
  'userManagement',
];

/**
 * Sections each role may open:
 * - admin → everything
 * - Mortgage Super User / Approver / User → Mortgage
 * - Capital User → Capital and Data Explorer
 * - CMHC → CMHC Dashboard
 * - Kingsett User (legacy) → everything except User Management
 * - any other or unknown role → nothing
 */
export function sectionsForRole(roleName: string | null | undefined): readonly AppSection[] {
  if (isAdminRole(roleName)) {
    return ALL_SECTIONS;
  }

  const normalized = normalizeRoleLabel(roleName);

  if (
    isMortgageSuperUserRole(roleName) ||
    isMortgageApproverRole(roleName) ||
    isMortgageUserRole(roleName)
  ) {
    return ['mortgage'];
  }
  if (normalized === 'capital user') {
    return ['capital', 'dataExplorer'];
  }
  if (normalized === 'cmhc' || normalized === 'cmhc user') {
    return ['cmhc'];
  }
  if (normalizeAppRole(roleName) === AppRole.KingsettUser) {
    return ALL_SECTIONS.filter((section) => section !== 'userManagement');
  }
  return [];
}

/** Mortgage User — LTV Validation is read-only for this role (Admin exempt). */
export function isMortgageUserRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage user';
}

export function isMortgageApproverRole(roleName: string | null | undefined): boolean {
  return normalizeRoleLabel(roleName) === 'mortgage approver';
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
