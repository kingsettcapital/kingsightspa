import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { X, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';

import { UnassignedLoanOption } from '../../../../core/interfaces/loan-table.interfaces';

@Component({
  selector: 'app-loan-alias-assign-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X }),
    },
  ],
  templateUrl: './loan-alias-assign-modal.component.html',
  styleUrl: './loan-alias-assign-modal.component.scss',
})
export class LoanAliasAssignModalComponent {
  readonly isOpen = input(false);
  readonly aliasName = input('');
  readonly unassignedLoans = input<UnassignedLoanOption[]>([]);
  readonly isLoading = input(false);

  readonly closed = output<void>();
  readonly submitted = output<string[]>();

  readonly closeIcon = X;
  readonly assignedLoanKeys = signal<string[]>([]);
  readonly leftSelection = signal<string | null>(null);
  readonly rightSelection = signal<string | null>(null);
  readonly draggingLoanKey = signal<string | null>(null);

  readonly assignedLoans = computed(() => {
    const keySet = new Set(this.assignedLoanKeys());
    return this.unassignedLoans().filter((loan) => keySet.has(loan.loanKey));
  });

  readonly availableLoans = computed(() => {
    const keySet = new Set(this.assignedLoanKeys());
    return this.unassignedLoans().filter((loan) => !keySet.has(loan.loanKey));
  });

  readonly canSubmit = computed(() => this.assignedLoanKeys().length > 0);

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.assignedLoanKeys.set([]);
        this.leftSelection.set(null);
        this.rightSelection.set(null);
        this.draggingLoanKey.set(null);
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

  selectLeft(loanKey: string): void {
    this.leftSelection.set(loanKey);
    this.rightSelection.set(null);
  }

  selectRight(loanKey: string): void {
    this.rightSelection.set(loanKey);
    this.leftSelection.set(null);
  }

  moveSelectedToAssign(): void {
    const selected = this.leftSelection();
    if (selected) {
      this.assignKeys([selected]);
      this.leftSelection.set(null);
      return;
    }
    this.assignKeys(this.availableLoans().map((loan) => loan.loanKey));
  }

  moveSelectedToUnassigned(): void {
    const selected = this.rightSelection();
    if (selected) {
      this.unassignKeys([selected]);
      this.rightSelection.set(null);
      return;
    }
    this.assignedLoanKeys.set([]);
  }

  assignKeys(loanKeys: string[]): void {
    if (!loanKeys.length) {
      return;
    }
    this.assignedLoanKeys.update((current) => [...new Set([...current, ...loanKeys])]);
  }

  unassignKeys(loanKeys: string[]): void {
    const removeSet = new Set(loanKeys);
    this.assignedLoanKeys.update((current) => current.filter((key) => !removeSet.has(key)));
  }

  onDragStart(loanKey: string): void {
    this.draggingLoanKey.set(loanKey);
  }

  onDragEnd(): void {
    this.draggingLoanKey.set(null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDropToAssign(event: DragEvent): void {
    event.preventDefault();
    const loanKey = this.draggingLoanKey();
    if (loanKey) {
      this.assignKeys([loanKey]);
    }
    this.draggingLoanKey.set(null);
  }

  onDropToUnassigned(event: DragEvent): void {
    event.preventDefault();
    const loanKey = this.draggingLoanKey();
    if (loanKey) {
      this.unassignKeys([loanKey]);
    }
    this.draggingLoanKey.set(null);
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }
    this.submitted.emit([...this.assignedLoanKeys()]);
  }

  formatLoanLabel(loan: UnassignedLoanOption): string {
    return `${loan.loanId} ${loan.loanDescription}`;
  }
}
