import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { X, LUCIDE_ICONS, LucideAngularModule, LucideIconProvider } from 'lucide-angular';

import { TAX_YEAR_OPTIONS } from '../../../../core/constants/tax-arrears-options';
import {
  TaxArrearsAddRecordPayload,
  TaxArrearsLoanLookup,
} from '../../../../core/interfaces/tax-arrears.interfaces';

export type TaxArrearsAddRecordForm = {
  loanAlias: string;
  taxMemoDate: string;
  loanId: string;
  loanDescription: string;
  syndicateId: string;
  syndicateDescription: string;
  taxYear: string;
  taxArrears: string;
  notes: string;
};

const EMPTY_FORM: TaxArrearsAddRecordForm = {
  loanAlias: '',
  taxMemoDate: '',
  loanId: '',
  loanDescription: '',
  syndicateId: '',
  syndicateDescription: '',
  taxYear: '',
  taxArrears: '',
  notes: '',
};

@Component({
  selector: 'app-tax-arrears-add-record-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X }),
    },
  ],
  templateUrl: './tax-arrears-add-record-modal.component.html',
  styleUrl: './tax-arrears-add-record-modal.component.scss',
})
export class TaxArrearsAddRecordModalComponent {
  readonly isOpen = input(false);
  readonly loanAliasOptions = input<{ value: string; label: string }[]>([]);
  readonly loansByAlias = input<Record<string, TaxArrearsLoanLookup>>({});

  readonly closed = output<void>();
  readonly submitted = output<TaxArrearsAddRecordPayload>();

  readonly closeIcon = X;
  readonly taxYearOptions = TAX_YEAR_OPTIONS;
  readonly form = signal<TaxArrearsAddRecordForm>({ ...EMPTY_FORM });

  readonly isFormValid = computed(() => this.validateForm(this.form()));

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        this.form.set({ ...EMPTY_FORM });
      }
    });
  }

  onLoanAliasChange(alias: string | null): void {
    const value = alias ?? '';
    const lookup = this.loansByAlias()[value];
    this.form.update((current) => ({
      ...current,
      loanAlias: value,
      loanId: lookup?.loanId ?? '',
      loanDescription: lookup?.loanDescription ?? '',
    }));
  }

  updateField<K extends keyof TaxArrearsAddRecordForm>(field: K, value: TaxArrearsAddRecordForm[K]): void {
    this.form.update((current) => ({
      ...current,
      [field]: value,
    }));
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
    if (!this.isFormValid()) {
      return;
    }
    const current = this.form();
    const taxArrears = this.parseCurrency(current.taxArrears);
    if (taxArrears === null) {
      return;
    }

    this.submitted.emit({
      loanAlias: current.loanAlias.trim(),
      taxMemoDate: current.taxMemoDate,
      loanId: current.loanId.trim(),
      loanDescription: current.loanDescription.trim(),
      syndicateId: current.syndicateId.trim(),
      syndicateDescription: current.syndicateDescription.trim(),
      taxYear: current.taxYear,
      taxArrears,
      notes: current.notes.trim(),
      userUpdatedDate: new Date().toISOString(),
      userUpdatedBy: 'system',
    });
  }

  private validateForm(form: TaxArrearsAddRecordForm): boolean {
    const requiredText = [
      form.loanAlias,
      form.taxMemoDate,
      form.loanId,
      form.loanDescription,
      form.syndicateId,
      form.syndicateDescription,
      form.taxYear,
      form.notes,
    ];
    if (!requiredText.every((value) => value.trim().length > 0)) {
      return false;
    }
    const taxArrears = this.parseCurrency(form.taxArrears);
    return taxArrears !== null && taxArrears >= 0;
  }

  private parseCurrency(value: string): number | null {
    const normalized = value.replace(/[$,\s]/g, '').trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
