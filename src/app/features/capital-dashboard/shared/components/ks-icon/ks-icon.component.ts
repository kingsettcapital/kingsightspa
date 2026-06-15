import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'ks-icon',
  standalone: true,
  template: `
    <span
      class="material-icons inline-flex items-center justify-center select-none leading-none"
      [class]="className()"
      [style.font-size.px]="size()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [attr.aria-hidden]="ariaHidden()"
      [attr.aria-label]="ariaLabel() || null"
    >{{ name() }}</span>
  `,
})
export class KsIconComponent {
  readonly name = input.required<string>();
  readonly size = input(20);
  readonly className = input('');
  readonly ariaHidden = input<string | boolean>(true);
  readonly ariaLabel = input<string | undefined>(undefined);
}
