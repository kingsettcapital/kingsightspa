import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import {
  RoleDto,
  UserDto,
  UserManagementApiService,
} from '../../core/services/user-management-api.service';
import { ToastService } from '../../core/services/toast.service';
import { RoleFormModalComponent, RoleFormSubmit } from './role-form-modal.component';
import { UserFormModalComponent, UserFormSubmit } from './user-form-modal.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, UserFormModalComponent, RoleFormModalComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  private readonly userManagementApi = inject(UserManagementApiService);
  private readonly toastService = inject(ToastService);

  readonly users = signal<UserDto[]>([]);
  readonly roles = signal<RoleDto[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  readonly userModalOpen = signal(false);
  readonly userModalMode = signal<'create' | 'edit'>('create');
  readonly selectedUser = signal<UserDto | null>(null);
  readonly userFormError = signal('');
  readonly isSavingUser = signal(false);

  readonly roleModalOpen = signal(false);
  readonly roleModalMode = signal<'create' | 'edit'>('create');
  readonly selectedRole = signal<RoleDto | null>(null);
  readonly roleFormError = signal('');
  readonly isSavingRole = signal(false);

  ngOnInit(): void {
    this.loadData();
  }

  trackByUserId(_index: number, user: UserDto): number {
    return user.userId;
  }

  trackByRoleId(_index: number, role: RoleDto): number {
    return role.roleId;
  }

  openCreateUser(): void {
    this.userModalMode.set('create');
    this.selectedUser.set(null);
    this.userFormError.set('');
    this.userModalOpen.set(true);
  }

  openEditUser(user: UserDto): void {
    this.userModalMode.set('edit');
    this.selectedUser.set(user);
    this.userFormError.set('');
    this.userModalOpen.set(true);
  }

  closeUserModal(): void {
    this.userModalOpen.set(false);
    this.userFormError.set('');
  }

  openCreateRole(): void {
    this.roleModalMode.set('create');
    this.selectedRole.set(null);
    this.roleFormError.set('');
    this.roleModalOpen.set(true);
  }

  openEditRole(role: RoleDto): void {
    this.roleModalMode.set('edit');
    this.selectedRole.set(role);
    this.roleFormError.set('');
    this.roleModalOpen.set(true);
  }

  closeRoleModal(): void {
    this.roleModalOpen.set(false);
    this.roleFormError.set('');
  }

  onUserFormSubmit(event: UserFormSubmit): void {
    this.isSavingUser.set(true);
    this.userFormError.set('');

    const request$ =
      event.mode === 'create'
        ? this.userManagementApi.createUser(event.body)
        : this.userManagementApi.updateUser(event.userId!, event.body);

    request$.subscribe({
      next: (saved) => {
        if (event.mode === 'create') {
          this.users.update((rows) => this.sortUsers([...rows, saved]));
          this.toastService.success(`User created (ID ${saved.userId}).`);
        } else {
          this.users.update((rows) =>
            this.sortUsers(rows.map((row) => (row.userId === saved.userId ? saved : row))),
          );
          this.toastService.success(`User ${saved.userId} updated.`);
        }
        this.isSavingUser.set(false);
        this.closeUserModal();
      },
      error: (error) => {
        this.isSavingUser.set(false);
        this.userFormError.set(this.extractBackendError(error, 'Failed to save user.'));
      },
    });
  }

  deleteUser(user: UserDto): void {
    const confirmed = window.confirm(`Delete user ${user.userId} (${user.email})?`);
    if (!confirmed) {
      return;
    }

    this.userManagementApi.deleteUser(user.userId).subscribe({
      next: () => {
        this.users.update((rows) => rows.filter((row) => row.userId !== user.userId));
        this.toastService.success(`User ${user.userId} deleted.`);
      },
      error: (error) => {
        this.toastService.error(this.extractBackendError(error, 'Failed to delete user.'));
      },
    });
  }

  onRoleFormSubmit(event: RoleFormSubmit): void {
    this.isSavingRole.set(true);
    this.roleFormError.set('');

    const request$ =
      event.mode === 'create'
        ? this.userManagementApi.createRole(event.body)
        : this.userManagementApi.updateRole(event.roleId!, event.body);

    request$.subscribe({
      next: (saved) => {
        if (event.mode === 'create') {
          this.roles.update((rows) => this.sortRoles([...rows, saved]));
          this.toastService.success(`Role created (ID ${saved.roleId}).`);
        } else {
          this.roles.update((rows) =>
            this.sortRoles(rows.map((row) => (row.roleId === saved.roleId ? saved : row))),
          );
          this.toastService.success(`Role ${saved.roleId} updated.`);
        }
        this.isSavingRole.set(false);
        this.closeRoleModal();
        this.loadUsers();
      },
      error: (error) => {
        this.isSavingRole.set(false);
        this.roleFormError.set(this.extractBackendError(error, 'Failed to save role.'));
      },
    });
  }

  deleteRole(role: RoleDto): void {
    const confirmed = window.confirm(`Delete role ${role.roleId} (${role.roleName})?`);
    if (!confirmed) {
      return;
    }

    this.userManagementApi.deleteRole(role.roleId).subscribe({
      next: () => {
        this.roles.update((rows) => rows.filter((row) => row.roleId !== role.roleId));
        this.toastService.success(`Role ${role.roleId} deleted.`);
      },
      error: (error) => {
        this.toastService.error(this.extractBackendError(error, 'Failed to delete role.'));
      },
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    forkJoin({
      users: this.userManagementApi.getUsers(),
      roles: this.userManagementApi.getRoles(),
    }).subscribe({
      next: ({ users, roles }) => {
        this.users.set(this.sortUsers(users));
        this.roles.set(this.sortRoles(roles));
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractBackendError(error, 'Unable to load user management data.'));
      },
    });
  }

  private loadUsers(): void {
    this.userManagementApi.getUsers().subscribe({
      next: (users) => this.users.set(this.sortUsers(users)),
      error: () => {
        // Role name labels may be stale; non-blocking refresh.
      },
    });
  }

  private sortUsers(users: UserDto[]): UserDto[] {
    return [...users].sort((a, b) => a.userId - b.userId);
  }

  private sortRoles(roles: RoleDto[]): RoleDto[] {
    return [...roles].sort((a, b) => a.roleId - b.roleId);
  }

  private extractBackendError(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') {
      return fallback;
    }

    const maybeError = error as {
      error?: { message?: string; title?: string; detail?: string } | string;
      message?: string;
    };

    if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
      return maybeError.error;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.message === 'string' &&
      maybeError.error.message.trim()
    ) {
      return maybeError.error.message;
    }
    if (
      maybeError.error &&
      typeof maybeError.error === 'object' &&
      typeof maybeError.error.detail === 'string' &&
      maybeError.error.detail.trim()
    ) {
      return maybeError.error.detail;
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }

    return fallback;
  }
}
