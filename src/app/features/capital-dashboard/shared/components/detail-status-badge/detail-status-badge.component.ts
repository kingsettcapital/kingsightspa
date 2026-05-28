import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-detail-status-badge',
  standalone: true,
  template: `<span [class]="badgeClass()">{{ displayLabel() }}</span>`,
  styleUrl: './detail-status-badge.component.scss',
})
export class DetailStatusBadgeComponent {
  readonly status = input<string | null | undefined>();

  readonly displayLabel = computed(() => {
    const value = this.status()?.trim();
    return value || '—';
  });

  readonly badgeClass = computed(() => {
    const normalized = (this.status() ?? '').trim().toLowerCase();
    const base = 'detail-status-badge';

    if (normalized === 'active') {
      return `${base} detail-status-badge--active`;
    }
    if (normalized === 'in progress') {
      return `${base} detail-status-badge--warning`;
    }
    if (normalized === 'dissolved' || normalized === 'inactive' || normalized === 'closed') {
      return `${base} detail-status-badge--inactive`;
    }
    if (!normalized || normalized === '—') {
      return `${base} detail-status-badge--neutral`;
    }
    return `${base} detail-status-badge--neutral`;
  });
}
