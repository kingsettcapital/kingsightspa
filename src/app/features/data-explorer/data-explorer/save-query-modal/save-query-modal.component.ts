import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider, Save, X } from 'lucide-angular';

import { SaveQueryPayload } from '../../interfaces/data-explorer.interfaces';

@Component({
  selector: 'app-save-query-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X, Save }),
    },
  ],
  templateUrl: './save-query-modal.component.html',
  styleUrl: './save-query-modal.component.scss',
})
export class SaveQueryModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly submitted = output<SaveQueryPayload>();

  readonly closeIcon = X;
  readonly saveIcon = Save;

  readonly name = signal('');
  readonly description = signal('');

  readonly isValid = computed(() => this.name().trim().length > 0);

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.name.set('');
        this.description.set('');
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.isValid()) {
      return;
    }

    this.submitted.emit({
      name: this.name().trim(),
      description: this.description().trim() || undefined,
    });
  }
}
