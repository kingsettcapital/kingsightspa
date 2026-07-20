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
