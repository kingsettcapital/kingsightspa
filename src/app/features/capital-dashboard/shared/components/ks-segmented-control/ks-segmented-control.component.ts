import { Component, input, output } from '@angular/core';

export interface KsSegmentOption<T extends string = string> {
  value: T;
  label: string;
}

@Component({
  selector: 'ks-segmented-control',
  standalone: true,
  template: `
    <div
      class="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
      role="group"
      [attr.aria-label]="ariaLabel()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
          [class.bg-white]="value() === option.value"
          [class.text-neutral-900]="value() === option.value"
          [class.shadow-sm]="value() === option.value"
          [class.text-neutral-500]="value() !== option.value"
          [class.hover:text-neutral-800]="value() !== option.value"
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
export class KsSegmentedControlComponent<T extends string = string> {
  readonly options = input.required<KsSegmentOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input('Options');
  readonly valueChange = output<T>();
}
