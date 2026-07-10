import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, of } from 'rxjs';

import {
  NotificationRecord,
  NotificationsApiService,
} from './notifications-api.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationUnreadCountService {
  private readonly notificationsApi = inject(NotificationsApiService);

  readonly count = signal(0);

  refresh(): void {
    this.notificationsApi
      .getAll()
      .pipe(
        map((rows) => rows.filter((row) => !row.isRead).length),
        catchError(() => of(0)),
      )
      .subscribe((count) => this.count.set(count));
  }

  syncFromRecords(records: readonly NotificationRecord[]): void {
    this.count.set(records.filter((row) => !row.isRead).length);
  }
}
