import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  Subject,
  switchMap,
} from 'rxjs';

import { AuthService } from './auth.service';
import {
  NotificationRecord,
  NotificationsApiService,
} from './notifications-api.service';

const POLL_INTERVAL_MS = 30_000;

@Injectable({
  providedIn: 'root',
})
export class NotificationUnreadCountService {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refreshTrigger = new Subject<void>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  readonly count = signal(0);

  constructor() {
    this.refreshTrigger
      .pipe(
        switchMap(() =>
          this.notificationsApi.getAll().pipe(
            map((rows) => rows.filter((row) => !row.isRead).length),
            // Keep the last known count on transient failures.
            catchError(() => EMPTY),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((count) => this.count.set(count));

    // After login completes (token available), refresh once so the badge is not stuck stale.
    toObservable(this.authService.isAuthenticated)
      .pipe(
        distinctUntilChanged(),
        filter((authenticated) => authenticated),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.started) {
          this.refresh();
        }
      });

    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Begin badge updates: immediate fetch, polling, and tab-focus refresh. */
  start(): void {
    if (this.started) {
      this.refresh();
      return;
    }

    this.started = true;
    this.refresh();
    this.pollTimer = setInterval(() => this.refresh(), POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  stop(): void {
    this.started = false;
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  refresh(): void {
    this.refreshTrigger.next();
  }

  syncFromRecords(records: readonly NotificationRecord[]): void {
    this.count.set(records.filter((row) => !row.isRead).length);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.refresh();
    }
  };
}
