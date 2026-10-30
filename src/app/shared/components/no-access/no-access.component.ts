import { Component, inject } from '@angular/core';

import { AccessControlService } from '../../../core/access/access-control.service';
import { AuthService } from '../../../core/services/auth.service';

/** Shown when the signed-in user's role doesn't open any section. */
@Component({
  selector: 'app-no-access',
  standalone: true,
  template: `
    <div class="ks-auth-shell">
      <h1 class="ks-type-title">No access</h1>
      @if (access.appUser(); as user) {
        <p class="ks-type-body ks-type-body--light">
          Your role ({{ user.roleName || 'none' }}) doesn't include any sections of KingSight yet.
        </p>
      } @else {
        <p class="ks-type-body ks-type-body--light">
          Your account ({{ email() }}) isn't registered in User Management.
        </p>
      }
      <p class="ks-type-body ks-type-body--light">Ask an administrator to assign you a role.</p>
    </div>
  `,
})
export class NoAccessComponent {
  protected readonly access = inject(AccessControlService);
  private readonly authService = inject(AuthService);

  protected email(): string {
    return this.authService.currentUser()?.email ?? 'unknown';
  }
}
