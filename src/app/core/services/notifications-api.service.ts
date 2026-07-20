import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { APP_API_CONFIG } from '../constants/api.config';

export type NotificationRecord = {
  notificationId: number;
  notificationType: string;
  notice: string;
  isRead: boolean;
  updatedBy: string;
  updatedDate: string;
};

@Injectable({
  providedIn: 'root',
})
export class NotificationsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(APP_API_CONFIG);

  private get baseUrl(): string {
    return `${this.apiConfig.baseUrl}/api/Notifications`;
  }

  getAll(): Observable<NotificationRecord[]> {
    return this.http.get<NotificationRecord[]>(this.baseUrl);
  }

  markAsRead(notificationIds: number[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/mark-read`, { notificationIds });
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/mark-all-read`, {});
  }
}
