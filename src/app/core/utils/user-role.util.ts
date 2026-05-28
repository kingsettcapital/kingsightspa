import { UserRole } from '../enums/user-role.enum';

export function parseUserRole(value: string | null | undefined): UserRole {
  const normalized = value?.trim().toLowerCase();
  if (normalized === UserRole.Administrator.toLowerCase()) {
    return UserRole.Administrator;
  }
  if (normalized === UserRole.User.toLowerCase()) {
    return UserRole.User;
  }
  return UserRole.User;
}
