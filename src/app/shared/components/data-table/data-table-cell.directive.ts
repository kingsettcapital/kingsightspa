import { Directive, inject, input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appDataTableCell]',
  standalone: true,
})
export class DataTableCellDirective {
  readonly columnId = input.required<string>({ alias: 'appDataTableCell' });
  readonly templateRef = inject(TemplateRef<unknown>);
}
