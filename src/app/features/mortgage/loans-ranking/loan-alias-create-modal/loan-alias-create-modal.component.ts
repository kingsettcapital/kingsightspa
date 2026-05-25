import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { X, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';

@Component({
  selector: 'app-loan-alias-create-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X }),
    },
  ],
  templateUrl: './loan-alias-create-modal.component.html',
  styleUrl: './loan-alias-create-modal.component.scss',
})
export class LoanAliasCreateModalComponent {
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly submitted = output<string>();

  readonly closeIcon = X;
  readonly aliasName = signal('');

  readonly isValid = computed(() => this.aliasName().trim().length > 0);

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.aliasName.set('');
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
    const value = this.aliasName().trim();
    if (!value) {
      return;
    }
    this.submitted.emit(value);
  }
}
