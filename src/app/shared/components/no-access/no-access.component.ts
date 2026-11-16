import { Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';

import {
  AccessControlService,
  NO_ACCESS_ROUTE,
} from '../../../core/access/access-control.service';
import { AuthService } from '../../../core/services/auth.service';

/** Shown when the signed-in user's role doesn't open any section. */
@Component({
  selector: 'app-no-access',
  standalone: true,
  template: `
    <div class="ks-auth-shell">
      @if (!access.isReady()) {
        <h1 class="ks-type-title">Loading access…</h1>
        <p class="ks-type-body ks-type-body--light">Checking your KingSight role.</p>
      } @else {
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
      }
    </div>
  `,
})
export class NoAccessComponent {
  protected readonly access = inject(AccessControlService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // Guards can land here before the role lookup finishes. Once a section is
    // available, leave this dead-end page automatically.
    effect(() => {
      if (!this.access.isReady()) {
        return;
      }
      const next = this.access.defaultRoute();
      if (next !== NO_ACCESS_ROUTE) {
        untracked(() => void this.router.navigateByUrl(next));
      }
    });
  }

  protected email(): string {
    return this.authService.currentUser()?.email ?? 'unknown';
  }
}
