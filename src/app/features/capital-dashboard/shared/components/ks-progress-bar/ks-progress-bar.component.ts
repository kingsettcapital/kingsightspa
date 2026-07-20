import { Component } from '@angular/core';

@Component({
  selector: 'ks-progress-bar',
  standalone: true,
  template: `
    <div class="h-1 w-full overflow-hidden bg-kingsett-pale-blue" role="progressbar" aria-label="Loading">
      <div class="h-full w-1/3 animate-pulse rounded-full bg-kingsett-blue"></div>
    </div>
  `,
  styles: `
    @keyframes ks-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    :host ::ng-deep div > div {
      animation: ks-indeterminate 1.2s ease-in-out infinite;
    }
  `,
})
export class KsProgressBarComponent {}
