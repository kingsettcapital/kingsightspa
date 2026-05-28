import { Component, computed, input } from '@angular/core';

/** KingSett Capital logo variants — Brand Guidelines v1.4 "Alternate Logos" */
export type KingsettLogoVariant = 'reversed' | 'secondary' | 'black' | 'white';

export type KingsettLogoLayout = 'full' | 'mark';

@Component({
  selector: 'app-kingsett-logo',
  standalone: true,
  templateUrl: './kingsett-logo.component.html',
  styleUrl: './kingsett-logo.component.scss',
  host: {
    class: 'ks-kingsett-logo',
    '[class.ks-kingsett-logo--reversed]': 'variant() === "reversed"',
    '[class.ks-kingsett-logo--secondary]': 'variant() === "secondary"',
    '[class.ks-kingsett-logo--black]': 'variant() === "black"',
    '[class.ks-kingsett-logo--white]': 'variant() === "white"',
    '[class.ks-kingsett-logo--sm]': 'size() === "sm"',
    '[class.ks-kingsett-logo--md]': 'size() === "md"',
    '[class.ks-kingsett-logo--lg]': 'size() === "lg"',
    '[class.ks-kingsett-logo--mark-only]': 'layout() === "mark"',
  },
})
export class KingsettLogoComponent {
  /** reversed = dark backgrounds; secondary = light backgrounds */
  readonly variant = input<KingsettLogoVariant>('secondary');
  readonly layout = input<KingsettLogoLayout>('full');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly viewBox = computed(() =>
    this.layout() === 'mark' ? '0 0 48 48' : '0 0 180 48',
  );
}
