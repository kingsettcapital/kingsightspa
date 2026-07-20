import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LUCIDE_ICONS, LucideAngularModule, LucideIconProvider, PenLine, Save, X } from 'lucide-angular';

import { SaveQueryPayload } from '../../interfaces/data-explorer.interfaces';

export type SaveQueryModalMode = 'create' | 'update';

@Component({
  selector: 'app-save-query-modal',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X, Save, PenLine }),
    },
  ],
  templateUrl: './save-query-modal.component.html',
  styleUrl: './save-query-modal.component.scss',
})
export class SaveQueryModalComponent {
  readonly isOpen = input(false);
  readonly saving = input(false);
  readonly mode = input<SaveQueryModalMode>('create');
  readonly initialName = input('');
  readonly initialDescription = input('');

  readonly closed = output<void>();
  readonly submitted = output<SaveQueryPayload>();

  readonly closeIcon = X;
  readonly saveIcon = Save;
  readonly updateIcon = PenLine;

  readonly name = signal('');
  readonly description = signal('');

  readonly isValid = computed(() => this.name().trim().length > 0);
  readonly canSubmit = computed(() => this.isValid() && !this.saving());
  readonly isUpdateMode = computed(() => this.mode() === 'update');

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.name.set('');
        this.description.set('');
        return;
      }

      if (this.mode() === 'update') {
        this.name.set(this.initialName());
        this.description.set(this.initialDescription());
      } else {
        this.name.set('');
        this.description.set('');
      }
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.saving()) {
      return;
    }
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    if (this.saving()) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    this.submitted.emit({
      name: this.name().trim(),
      description: this.description().trim() || undefined,
    });
  }
}
