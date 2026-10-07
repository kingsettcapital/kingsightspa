import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CurrentAppUserService } from '../../../core/services/current-app-user.service';
import { LoanDto, LoansApiService } from '../../../core/services/loans-api.service';
import {
  TaxArrearsCaptureApiService,
  TaxArrearsCaptureRowDto,
} from '../../../core/services/tax-arrears-capture-api.service';
import { extractApiError } from '../../../core/utils/api-error.util';
import { parseCurrencyInput } from '../../../core/utils/mortgage-currency-input.util';

type LoanOption = { loanKey: number; loanCode: string; loanName: string; label: string };

type TaxMemoForm = {
  loanCode: string | null;
  taxMemoDate: string;
  taxYear: string;
  taxArrears: string;
  notes: string;
};

/** Tax Arrears "Add New Row" (same fields, defaults and validation) with the report's loan alias pre-selected. */
@Component({
  selector: 'app-tax-memo-add-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectComponent],
  styleUrl: './report-edit-dialog.css',
  template: `
    <div class="ks-modal-backdrop" (click)="close()">
      <div class="ks-modal red-modal" role="dialog" aria-modal="true" aria-labelledby="tmAddTitle" (click)="$event.stopPropagation()">
        <header class="ks-modal__header">
          <h2 class="ks-modal__title" id="tmAddTitle">Add New Row</h2>
          <button type="button" class="ks-modal__close" (click)="close()" aria-label="Close">×</button>
        </header>
        <div class="ks-modal__body">
          @if (isLoading()) {
            <p class="red-muted">Loading loans…</p>
          } @else {
            <div class="red-field">
              <span class="ks-label">Loan Alias</span>
              <span class="red-readonly">{{ loanAliasName() }}</span>
            </div>

            <div class="red-field">
              <label class="ks-label" for="tmLoan">Loan</label>
              <ng-select
                id="tmLoan"
                class="ks-ng-select red-loan-select"
                [items]="loanOptions()"
                bindLabel="label"
                bindValue="loanCode"
                [clearable]="true"
                [searchable]="true"
                [ngModel]="form().loanCode"
                (ngModelChange)="patch('loanCode', $event ?? null)"
                placeholder="Select loan"
                notFoundText="No loans found for this alias"
              ></ng-select>
              @if (loanOptions().length === 0) {
                <p class="red-muted">
                  No loans are assigned to this alias. Assign loans on Loan Alias Assignment, then try again.
                </p>
              }
            </div>

            <div class="red-grid">
              <div class="red-field">
                <span class="ks-label">Loan Code</span>
                <span class="red-readonly">{{ loanPreview().loanCode }}</span>
              </div>
              <div class="red-field">
                <span class="ks-label">Loan Name</span>
                <span class="red-readonly">{{ loanPreview().loanName }}</span>
              </div>
              <div class="red-field">
                <label class="ks-label" for="tmMemoDate">Tax Memo Date</label>
                <input id="tmMemoDate" class="ks-input" type="date" [value]="form().taxMemoDate"
                  (input)="patch('taxMemoDate', $any($event.target).value)" />
                <p class="red-muted">
                  Unique per loan for each tax memo date + tax year pair. Same memo date can be reused with a different tax year.
                </p>
              </div>
              <div class="red-field">
                <label class="ks-label" for="tmTaxYear">Tax Year</label>
                <select id="tmTaxYear" class="ks-select" (change)="patch('taxYear', $any($event.target).value)">
                  <option value="" [selected]="!form().taxYear.trim()">—</option>
                  @for (year of taxYears(); track year) {
                    <option [value]="year" [selected]="form().taxYear === year">{{ year }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="red-field">
              <label class="ks-label" for="tmTaxArrears">Tax Arrears</label>
              <input id="tmTaxArrears" class="ks-input red-num" type="text" inputmode="decimal" placeholder="$0.00"
                [value]="form().taxArrears" (input)="patch('taxArrears', $any($event.target).value)" />
            </div>

            <div class="red-field">
              <label class="ks-label" for="tmNotes">Notes</label>
              <textarea id="tmNotes" class="ks-input red-textarea" placeholder="Optional notes"
                [value]="form().notes" (input)="patch('notes', $any($event.target).value)"></textarea>
            </div>
          }
          @if (error()) {
            <p class="red-error">{{ error() }}</p>
          }
        </div>
        <footer class="ks-modal__footer">
          <button type="button" class="ks-btn ks-btn--accent" (click)="close()" [disabled]="isSaving()">Cancel</button>
          <button type="button" class="ks-btn ks-btn--accent" (click)="saveAndClose()" [disabled]="isSaving() || isLoading()">
            {{ isSaving() ? 'Saving…' : 'Save Row' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class TaxMemoAddDialogComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly taxArrearsApi = inject(TaxArrearsCaptureApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly loanAliasKey = input.required<number>();
  readonly loanAliasName = input.required<string>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly loanOptions = signal<LoanOption[]>([]);
  readonly taxYears = signal<string[]>([]);
  readonly form = signal<TaxMemoForm>({
    loanCode: null,
    taxMemoDate: '',
    taxYear: String(new Date().getFullYear()),
    taxArrears: '',
    notes: '',
  });
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly error = signal('');

  readonly loanPreview = computed(() => {
    const code = this.form().loanCode;
    const loan = code ? this.loanOptions().find((option) => option.loanCode === code) : undefined;
    return { loanCode: loan?.loanCode ?? '—', loanName: loan?.loanName ?? '—' };
  });

  private existingRecords: TaxArrearsCaptureRowDto[] = [];

  ngOnInit(): void {
    forkJoin({
      loans: this.loansApi.getLoans().pipe(catchError(() => of([] as LoanDto[]))),
      lookups: this.taxArrearsApi.getLookups().pipe(catchError(() => of({ taxYears: [] }))),
      records: this.taxArrearsApi.getRecords([]).pipe(catchError(() => of([] as TaxArrearsCaptureRowDto[]))),
    }).subscribe({
      next: ({ loans, lookups, records }) => {
        this.loanOptions.set(this.loansForAlias(loans));
        this.taxYears.set(this.buildTaxYears(lookups.taxYears ?? []));
        this.existingRecords = records;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load loans for this alias.'));
        this.isLoading.set(false);
      },
    });
  }

  patch<K extends keyof TaxMemoForm>(field: K, value: TaxMemoForm[K]): void {
    this.form.update((current) => ({ ...current, [field]: value }));
    this.error.set('');
  }

  saveAndClose(): void {
    if (this.isSaving()) {
      return;
    }
    const f = this.form();
    if (!f.loanCode) {
      this.error.set('Select a loan for the new record.');
      return;
    }
    if (!f.taxMemoDate.trim()) {
      this.error.set('Tax memo date is required.');
      return;
    }
    if (!f.taxYear.trim()) {
      this.error.set('Tax year is required.');
      return;
    }
    if (this.isDuplicate(f.loanCode, f.taxMemoDate, f.taxYear)) {
      this.error.set(
        `Loan ${f.loanCode} already has tax memo date ${f.taxMemoDate.trim()} for tax year ${f.taxYear.trim()}. Change the tax year or memo date.`,
      );
      return;
    }
    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.error.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const loan = this.loanOptions().find((option) => option.loanCode === f.loanCode);
    this.isSaving.set(true);
    this.error.set('');
    this.taxArrearsApi
      .createRecord({
        loanKey: loan?.loanKey ?? 0,
        loanCode: f.loanCode,
        taxMemoDate: f.taxMemoDate.trim() || null,
        taxArrears: parseCurrencyInput(f.taxArrears),
        taxYear: f.taxYear.trim() || null,
        notes: f.notes.trim() || null,
        userUpdatedBy,
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.error.set(extractApiError(err, 'Failed to add tax arrears record.'));
        },
      });
  }

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  private loansForAlias(loans: LoanDto[]): LoanOption[] {
    const aliasName = this.loanAliasName().trim().toLowerCase();
    return loans
      .filter(
        (loan) =>
          Number(loan.loanAliasKey ?? 0) === this.loanAliasKey() ||
          (aliasName.length > 0 && loan.loanAliasName?.trim().toLowerCase() === aliasName),
      )
      .map((loan) => {
        const loanCode = loan.loanCode?.trim() || '';
        const loanName = loan.loanDesc?.trim() || '—';
        return {
          loanKey: Number(loan.loanKey) > 0 ? Number(loan.loanKey) : 0,
          loanCode,
          loanName,
          label: `${loanCode} — ${loanName}`,
        };
      })
      .filter((option) => option.loanCode.length > 0)
      .sort((a, b) => a.loanCode.localeCompare(b.loanCode, undefined, { sensitivity: 'base' }));
  }

  private buildTaxYears(fromApi: (number | string)[]): string[] {
    const years = new Set<string>();
    const current = new Date().getFullYear();
    for (let y = current + 1; y >= current - 15; y -= 1) {
      years.add(String(y));
    }
    for (const year of fromApi) {
      const normalized = String(year).trim();
      if (normalized) {
        years.add(normalized);
      }
    }
    return [...years].sort((a, b) => Number(b) - Number(a));
  }

  private isDuplicate(loanCode: string, taxMemoDate: string, taxYear: string): boolean {
    const key = `${loanCode.trim().toLowerCase()}|${taxMemoDate.trim()}|${taxYear.trim()}`;
    return this.existingRecords.some((row) => {
      const memo = String(row.taxMemoDate ?? '').trim().slice(0, 10);
      const rowKey = `${(row.loanId ?? '').trim().toLowerCase()}|${memo}|${String(row.taxYear ?? '').trim()}`;
      return rowKey === key;
    });
  }
}
