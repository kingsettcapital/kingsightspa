import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-portal-spinner',
  standalone: true,
  template: `<div class="ks-portal-spinner" [style.--ks-spinner-size.px]="size" aria-label="Loading"></div>`,
})
export class PortalSpinnerComponent {
  @Input() size = 32;
}

