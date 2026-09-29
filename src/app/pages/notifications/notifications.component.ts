import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  NotificationRecord,
  NotificationsApiService,
} from '../../core/services/notifications-api.service';
import { NotificationUnreadCountService } from '../../core/services/notification-unread-count.service';
import { formatModifiedDate as formatAuditModifiedDate } from '../../core/utils/format-modified-date.util';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly notificationUnreadCount = inject(NotificationUnreadCountService);

  readonly notifications = signal<NotificationRecord[]>([]);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  readonly unreadNotifications = computed(() =>
    this.notifications().filter((row) => !row.isRead),
  );

  readonly readNotifications = computed(() =>
    this.notifications().filter((row) => row.isRead),
  );

  ngOnInit(): void {
    this.loadNotifications();
  }

  toggleRead(row: NotificationRecord, checked: boolean): void {
    if (!checked || row.isRead || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.notificationsApi.markAsRead([row.notificationId]).subscribe({
      next: () => {
        this.notifications.update((rows) =>
          rows.map((item) =>
            item.notificationId === row.notificationId ? { ...item, isRead: true } : item,
          ),
        );
        this.notificationUnreadCount.syncFromRecords(this.notifications());
        this.statusMessage.set('Notification marked as read.');
        this.isSaving.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to mark notification as read.');
        this.isSaving.set(false);
      },
    });
  }

  markAllAsRead(): void {
    if (!this.unreadNotifications().length || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');

    this.notificationsApi.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((rows) => rows.map((row) => ({ ...row, isRead: true })));
        this.notificationUnreadCount.syncFromRecords(this.notifications());
        this.statusMessage.set('All notifications marked as read.');
        this.isSaving.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to mark all notifications as read.');
        this.isSaving.set(false);
      },
    });
  }

  formatModifiedDate(value: string): string {
    return formatAuditModifiedDate(value);
  }

  private loadNotifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.notificationsApi.getAll().subscribe({
      next: (rows) => {
        this.notifications.set(
          [...rows].sort(
            (left, right) =>
              new Date(right.updatedDate).getTime() - new Date(left.updatedDate).getTime(),
          ),
        );
        this.notificationUnreadCount.syncFromRecords(this.notifications());
        this.isLoading.set(false);
      },
      error: (error: { status?: number }) => {
        this.notifications.set([]);
        this.notificationUnreadCount.syncFromRecords([]);
        this.errorMessage.set(
          error?.status === 500
            ? 'Unable to load notifications. Ensure subjective_input.notifications exists (run kingsightapi SQL scripts) and restart the API.'
            : 'Unable to load notifications. Verify API availability.',
        );
        this.isLoading.set(false);
      },
    });
  }
}
