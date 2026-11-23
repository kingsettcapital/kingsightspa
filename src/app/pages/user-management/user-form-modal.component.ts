import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CMHC_ROLE_NAMES,
  type CmhcRoleName,
  type CmhcUserAccessDto,
  type CmhcUserAccessSaveRequest,
  type RoleDto,
  type UserDto,
  type UserSaveRequest,
} from '../../core/services/user-management-api.service';

export type UserFormMode = 'create' | 'edit';

export type UserFormSubmit = {
  mode: UserFormMode;
  userId: number | null;
  body: UserSaveRequest;
  /** CMHC sub-roles; null when unchanged. */
  cmhcAccess: CmhcUserAccessSaveRequest | null;
};

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.css',
})
export class UserFormModalComponent {
  readonly isOpen = input(false);
  readonly mode = input<UserFormMode>('create');
  readonly user = input<UserDto | null>(null);
  readonly roles = input<RoleDto[]>([]);
  readonly isSaving = input(false);
  readonly errorMessage = input('');
  /** The user's current CMHC sub-roles (edit mode). */
  readonly cmhcAccess = input<CmhcUserAccessDto | null>(null);

  readonly closed = output<void>();
  readonly submitted = output<UserFormSubmit>();

  readonly email = signal('');
  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly isActive = signal(true);
  readonly roleId = signal<number | null>(null);
  readonly emailError = signal('');

  readonly cmhcRoleNames = CMHC_ROLE_NAMES;
  readonly cmhcRoles = signal<CmhcRoleName[]>([]);
  readonly cmhcLinkedName = signal('');
  /** Underwriters and Originators are matched to loans by this name. */
  /** Sub-roles apply only to the CMHC app role. */
  readonly isCmhcRoleSelected = computed(() => {
    const role = this.roles().find((r) => r.roleId === this.roleId());
    const name = (role?.roleName ?? '').trim().toLowerCase();
    return name === 'cmhc' || name === 'cmhc user';
  });

  readonly needsLinkedName = computed(() =>
    this.isCmhcRoleSelected() &&
    this.cmhcRoles().some((r) => r === 'Underwriter' || r === 'Originator'),
  );

  readonly heading = computed(() => (this.mode() === 'create' ? 'Add User' : 'Edit User'));
  readonly editingUserId = computed(() => this.user()?.userId ?? null);

  readonly isValid = computed(() => {
    const email = this.email().trim();
    return (
      email.length > 0 &&
      this.isValidEmail(email) &&
      this.roleId() != null &&
      this.roleId()! > 0 &&
      (!this.needsLinkedName() || this.cmhcLinkedName().trim().length > 0)
    );
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.resetForm();
        return;
      }

      const existing = this.user();
      if (this.mode() === 'edit' && existing) {
        this.email.set(existing.email);
        this.firstName.set(existing.firstName ?? '');
        this.lastName.set(existing.lastName ?? '');
        this.isActive.set(existing.isActive);
        this.roleId.set(existing.roleId);
        const access = this.cmhcAccess();
        this.cmhcRoles.set(access?.roles ? [...access.roles] : []);
        this.cmhcLinkedName.set(access?.linkedName ?? '');
      } else {
        this.resetForm();
        const firstRole = this.roles()[0];
        if (firstRole) {
          this.roleId.set(firstRole.roleId);
        }
      }
      this.emailError.set('');
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  validateEmail(): void {
    const email = this.email().trim();
    if (!email) {
      this.emailError.set('Email is required.');
      return;
    }
    if (!this.isValidEmail(email)) {
      this.emailError.set('Enter a valid email address.');
      return;
    }
    this.emailError.set('');
  }

  submit(): void {
    this.validateEmail();
    if (!this.isValid()) {
      return;
    }

    const roleId = this.roleId();
    if (roleId == null || roleId <= 0) {
      return;
    }

    // Any other role clears the CMHC sub-roles.
    const isCmhc = this.isCmhcRoleSelected();
    const roles = isCmhc ? CMHC_ROLE_NAMES.filter((r) => this.cmhcRoles().includes(r)) : [];
    const needsName = roles.some((r) => r === 'Underwriter' || r === 'Originator');
    const linkedName = needsName ? this.cmhcLinkedName().trim() || null : null;
    const before = this.cmhcAccess();
    const beforeRoles = CMHC_ROLE_NAMES.filter((r) => before?.roles?.includes(r));
    const cmhcChanged =
      roles.join(',') !== beforeRoles.join(',') || (linkedName ?? '') !== (before?.linkedName?.trim() ?? '');

    this.submitted.emit({
      mode: this.mode(),
      userId: this.editingUserId(),
      cmhcAccess: cmhcChanged ? { roles, linkedName } : null,
      body: {
        email: this.email().trim(),
        firstName: this.firstName().trim() || null,
        lastName: this.lastName().trim() || null,
        isActive: this.isActive(),
        roleId,
      },
    });
  }

  private resetForm(): void {
    this.email.set('');
    this.firstName.set('');
    this.lastName.set('');
    this.isActive.set(true);
    this.roleId.set(null);
    this.emailError.set('');
    this.cmhcRoles.set([]);
    this.cmhcLinkedName.set('');
  }

  toggleCmhcRole(role: CmhcRoleName, checked: boolean): void {
    this.cmhcRoles.update((cur) =>
      checked ? [...cur.filter((r) => r !== role), role] : cur.filter((r) => r !== role),
    );
  }

  isRoleOptionActive(role: RoleDto): boolean {
    const normalized = (role.status ?? '').trim().toUpperCase();
    return normalized === 'A' || normalized === 'Y' || normalized === '1' || normalized === 'ACTIVE';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
