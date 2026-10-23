import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, map, of, switchMap } from 'rxjs';

import { AuthService } from './auth.service';
import { UserDto, UserManagementApiService } from './user-management-api.service';

@Injectable({
  providedIn: 'root',
})
export class CurrentAppUserService {
  private readonly authService = inject(AuthService);
  private readonly userManagementApi = inject(UserManagementApiService);

  /** Email we already fetched (success, not-found, or error) — prevents infinite retries. */
  private loadedEmail: string | null = null;
  private loadRequestId = 0;

  readonly user = signal<UserDto | null>(null);
  readonly isLoading = signal(false);

  readonly registrationRequiredMessage =
    'Your account is not registered in User Management. Ask an administrator to add your email before saving.';

  constructor() {
    effect(() => {
      const email = this.authService.currentUser()?.email?.trim().toLowerCase() ?? '';

      if (!email) {
        untracked(() => {
          this.loadedEmail = null;
          this.user.set(null);
          this.isLoading.set(false);
        });
        return;
      }

      if (email === this.loadedEmail) {
        return;
      }

      this.loadedEmail = email;
      this.loadUserByEmail(email);
    });
  }

  /** Call after an admin adds the signed-in user to User Management. */
  reload(): void {
    this.loadedEmail = null;
    const email = this.authService.currentUser()?.email?.trim().toLowerCase() ?? '';
    if (email) {
      this.loadedEmail = email;
      this.loadUserByEmail(email);
    }
  }

  static formatDisplayName(user: UserDto): string {
    const name = [user.firstName, user.lastName]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(' ')
      .trim();
    return name || user.email.trim();
  }

  getUpdatedBy(): string | null {
    const current = this.user();
    return current ? CurrentAppUserService.formatDisplayName(current) : null;
  }

  getUserId(): number | null {
    return this.user()?.userId ?? null;
  }

  private loadUserByEmail(email: string): void {
    const requestId = ++this.loadRequestId;

    untracked(() => this.isLoading.set(true));

    // Fall back to the full list when /users/me can't match (older API, or token UPN differs).
    this.userManagementApi
      .getCurrentUser()
      .pipe(
        map((user): UserDto | null =>
          user?.email?.trim().toLowerCase() === email ? user : null,
        ),
        catchError(() => of(null)),
        switchMap((user) =>
          user
            ? of(user)
            : this.userManagementApi
                .getUsers()
                .pipe(
                  map(
                    (users) =>
                      users.find((candidate) => candidate.email.trim().toLowerCase() === email) ??
                      null,
                  ),
                ),
        ),
      )
      .subscribe({
      next: (match) => {
        if (requestId !== this.loadRequestId) {
          return;
        }

        untracked(() => {
          this.user.set(match);
          this.isLoading.set(false);
        });
      },
      error: () => {
        if (requestId !== this.loadRequestId) {
          return;
        }

        untracked(() => {
          this.user.set(null);
          this.isLoading.set(false);
        });
      },
    });
  }
}
