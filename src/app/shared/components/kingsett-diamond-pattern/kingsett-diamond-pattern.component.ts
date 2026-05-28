import { Component, input } from '@angular/core';

export type KingsettDiamondLayout = 'a' | 'b';

@Component({
  selector: 'app-kingsett-diamond-pattern',
  standalone: true,
  templateUrl: './kingsett-diamond-pattern.component.html',
})
export class KingsettDiamondPatternComponent {
  /** Layout A: C = 1.5B. Layout B: C = A + B (brand guidelines). */
  readonly layout = input<KingsettDiamondLayout>('a');
}
