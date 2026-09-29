import { Component, input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KsIconComponent } from '../ks-icon/ks-icon.component';

@Component({
  selector: 'ks-search-field',
  standalone: true,
  imports: [FormsModule, KsIconComponent],
  template: `
    <label class="block w-full">
      <span class="sr-only">{{ ariaLabel() }}</span>
      <div
        class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 transition-colors focus-within:border-neutral-400"
      >
        <ks-icon name="search" [size]="18" className="text-neutral-400 shrink-0" />
        <input
          class="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
          type="search"
          [ngModel]="value()"
          (ngModelChange)="value.set($event)"
          [placeholder]="placeholder()"
          [attr.aria-label]="ariaLabel()"
        />
      </div>
    </label>
  `,
})
export class KsSearchFieldComponent {
  readonly value = model('');
  readonly placeholder = input('Search...');
  readonly ariaLabel = input('Search');
}
