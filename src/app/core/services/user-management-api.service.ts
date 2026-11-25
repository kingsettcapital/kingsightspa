import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { APP_API_CONFIG } from '../constants/api.config';

export type RoleDto = {
  roleId: number;
  roleName: string;
  status: string | null;
};

export type UserDto = {
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  dateCreated: string;
  dateModified: string | null;
  roleId: number;
  roleName: string;
};

export type RoleSaveRequest = {
  roleName: string;
  status?: string | null;
};

export type UserSaveRequest = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive: boolean;
  roleId: number;
};

/** CMHC dashboard sub-roles; Admin comes from the app role. */
export type CmhcRoleName = 'Underwriter' | 'Reviewer' | 'Originator';
export const CMHC_ROLE_NAMES: readonly CmhcRoleName[] = ['Underwriter', 'Reviewer', 'Originator'];

export type CmhcUserAccessDto = {
  userId: number;
  roles: CmhcRoleName[];
  /** Name as it appears in the loan data (Funder/Underwriter or Originating Originator). */
  linkedName: string | null;
  updatedBy?: string | null;
  updatedDatetime?: string | null;
};

export type CmhcUserAccessSaveRequest = {
  roles: CmhcRoleName[];
  linkedName: string | null;
};

export type RoleUpdateRequest = RoleSaveRequest;
export type UserUpdateRequest = UserSaveRequest;

@Injectable({
  providedIn: 'root',
})
export class UserManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/user-management`;
  }

  getUsers() {
    return this.http.get<UserDto[]>(`${this.baseUrl}/users`);
  }

  getCurrentUser() {
    return this.http.get<UserDto>(`${this.baseUrl}/users/me`);
  }

  getUser(userId: number) {
    return this.http.get<UserDto>(`${this.baseUrl}/users/${userId}`);
  }

  createUser(body: UserSaveRequest) {
    return this.http.post<UserDto>(`${this.baseUrl}/users`, body);
  }

  updateUser(userId: number, body: UserUpdateRequest) {
    return this.http.put<UserDto>(`${this.baseUrl}/users/${userId}`, body);
  }

  deleteUser(userId: number) {
    return this.http.delete<void>(`${this.baseUrl}/users/${userId}`);
  }

  getCmhcAccess() {
    return this.http.get<CmhcUserAccessDto[]>(`${this.baseUrl}/cmhc-access`);
  }

  saveCmhcAccess(userId: number, body: CmhcUserAccessSaveRequest) {
    return this.http.put<CmhcUserAccessDto>(`${this.baseUrl}/users/${userId}/cmhc-access`, body);
  }

  getRoles() {
    return this.http.get<RoleDto[]>(`${this.baseUrl}/roles`);
  }

  getRole(roleId: number) {
    return this.http.get<RoleDto>(`${this.baseUrl}/roles/${roleId}`);
  }

  createRole(body: RoleSaveRequest) {
    return this.http.post<RoleDto>(`${this.baseUrl}/roles`, body);
  }

  updateRole(roleId: number, body: RoleUpdateRequest) {
    return this.http.put<RoleDto>(`${this.baseUrl}/roles/${roleId}`, body);
  }

  deleteRole(roleId: number) {
    return this.http.delete<void>(`${this.baseUrl}/roles/${roleId}`);
  }
}
