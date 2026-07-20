import { Component, computed, input } from '@angular/core';

export type KsBadgeVariant = 'default' | 'outlined' | 'success' | 'warning' | 'gold';

@Component({
  selector: 'ks-badge',
  standalone: true,
  template: `
    <span [class]="classes()"><ng-content /></span>
  `,
})
export class KsBadgeComponent {
  readonly variant = input<KsBadgeVariant>('default');

  readonly classes = computed(() => {
    const base =
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 whitespace-nowrap';
    switch (this.variant()) {
      case 'outlined':
        return `${base} border border-kingsett-blue text-kingsett-blue bg-white`;
      case 'success':
        return `${base} bg-[#668c62] text-white`;
      case 'warning':
        return `${base} bg-kingsett-gold text-white`;
      case 'gold':
        return `${base} bg-kingsett-gold text-white`;
      default:
        return `${base} bg-neutral-500 text-white`;
    }
  });
}
