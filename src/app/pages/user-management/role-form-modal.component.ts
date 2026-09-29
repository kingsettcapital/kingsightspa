import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { RoleDto, RoleSaveRequest } from '../../core/services/user-management-api.service';

export type RoleFormMode = 'create' | 'edit';

export type RoleFormSubmit = {
  mode: RoleFormMode;
  roleId: number | null;
  body: RoleSaveRequest;
};

@Component({
  selector: 'app-role-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './role-form-modal.component.html',
  styleUrl: './role-form-modal.component.css',
})
export class RoleFormModalComponent {
  readonly isOpen = input(false);
  readonly mode = input<RoleFormMode>('create');
  readonly role = input<RoleDto | null>(null);
  readonly isSaving = input(false);
  readonly errorMessage = input('');

  readonly closed = output<void>();
  readonly submitted = output<RoleFormSubmit>();

  readonly roleName = signal('');
  readonly isActive = signal(true);

  readonly heading = computed(() => (this.mode() === 'create' ? 'Add Role' : 'Edit Role'));
  readonly editingRoleId = computed(() => this.role()?.roleId ?? null);

  readonly isValid = computed(() => this.roleName().trim().length > 0);

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.roleName.set('');
        this.isActive.set(true);
        return;
      }

      const existing = this.role();
      if (this.mode() === 'edit' && existing) {
        this.roleName.set(existing.roleName);
        this.isActive.set(this.isActiveStatus(existing.status));
      } else {
        this.roleName.set('');
        this.isActive.set(true);
      }
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

  submit(): void {
    if (!this.isValid()) {
      return;
    }

    this.submitted.emit({
      mode: this.mode(),
      roleId: this.editingRoleId(),
      body: {
        roleName: this.roleName().trim(),
        status: this.isActive() ? 'A' : 'I',
      },
    });
  }

  private isActiveStatus(status: string | null | undefined): boolean {
    const normalized = (status ?? '').trim().toUpperCase();
    return normalized === 'A' || normalized === 'Y' || normalized === '1' || normalized === 'ACTIVE';
  }
}
