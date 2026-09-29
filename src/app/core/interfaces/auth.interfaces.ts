import { UserRole } from '../enums/user-role.enum';

export interface AuthUser {
  name: string;
  email: string;
  username: string;
  role: UserRole;
}
