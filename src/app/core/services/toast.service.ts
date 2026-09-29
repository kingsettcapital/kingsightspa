import { Injectable, signal } from '@angular/core';

import { ToastMessage, ToastType } from '../interfaces/toast.interfaces';

const DEFAULT_DURATION_MS = 4000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  success(message: string, durationMs = DEFAULT_DURATION_MS): void {
    this.show(message, 'success', durationMs);
  }

  error(message: string, durationMs = 5000): void {
    this.show(message, 'error', durationMs);
  }

  info(message: string, durationMs = DEFAULT_DURATION_MS): void {
    this.show(message, 'info', durationMs);
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }

  private show(message: string, type: ToastType, durationMs: number): void {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.toasts.update((current) => [...current, { id, message: trimmed, type }]);

    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }
}
