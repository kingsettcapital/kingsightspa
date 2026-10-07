import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { map, of, switchMap } from 'rxjs';

import { CurrentAppUserService } from '../../../core/services/current-app-user.service';
import {
  LoanSecurityValueApiService,
  LoanSecurityValueDto,
} from '../../../core/services/loan-security-value-api.service';
import { extractApiError } from '../../../core/utils/api-error.util';
import {
  formatCurrencyDisplay,
  parseCurrencyInput,
  parseNumericInput,
} from '../../../core/utils/mortgage-currency-input.util';

type EditableField = 'securityValue' | 'units' | 'squareFeet' | 'acres';
type EditableValues = Record<EditableField, number | null>;

type PropertyStatsRecord = EditableValues & {
  loanAliasId: number;
  loanAliasName: string;
  collateralPerYardi: number | null;
};

/** Loan Exposure Markers fields for the report's loan alias — same parsing/formatting as the Loan Exposure Markers page. */
@Component({
  selector: 'app-property-stats-edit-dialog',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './report-edit-dialog.css',
  template: `
    <div class="ks-modal-backdrop" (click)="close()">
      <div class="ks-modal red-modal" role="dialog" aria-modal="true" aria-labelledby="psEditTitle" (click)="$event.stopPropagation()">
        <header class="ks-modal__header">
          <h2 class="ks-modal__title" id="psEditTitle">Edit Property Stats — {{ loanAliasName() }}</h2>
          <button type="button" class="ks-modal__close" (click)="close()" aria-label="Close">×</button>
        </header>
        <div class="ks-modal__body">
          @if (isLoading()) {
            <p class="red-muted">Loading loan exposure markers…</p>
          } @else if (record(); as r) {
            <div class="red-grid">
              <div class="red-field">
                <span class="ks-label">Loan Alias</span>
                <span class="red-readonly">{{ r.loanAliasName }}</span>
              </div>
              <div class="red-field">
                <span class="ks-label">Collateral Per Yardi</span>
                <span class="red-readonly">{{ formatCurrency(r.collateralPerYardi) }}</span>
              </div>
              <label class="red-field">
                <span class="ks-label">Security Value</span>
                <input class="ks-input red-num" type="text" inputmode="decimal" placeholder="$0"
                  [value]="fieldInputDisplay('securityValue', r.securityValue)"
                  (input)="onFieldInput('securityValue', $any($event.target).value)"
                  (blur)="commitField('securityValue', $any($event.target))" />
              </label>
              <label class="red-field">
                <span class="ks-label">Units</span>
                <input class="ks-input red-num" type="text" inputmode="numeric" placeholder="0"
                  [value]="fieldInputDisplay('units', r.units)"
                  (input)="onFieldInput('units', $any($event.target).value)"
                  (blur)="commitField('units', $any($event.target))" />
              </label>
              <label class="red-field">
                <span class="ks-label">SF</span>
                <input class="ks-input red-num" type="text" inputmode="decimal" placeholder="0"
                  [value]="fieldInputDisplay('squareFeet', r.squareFeet)"
                  (input)="onFieldInput('squareFeet', $any($event.target).value)"
                  (blur)="commitField('squareFeet', $any($event.target))" />
              </label>
              <label class="red-field">
                <span class="ks-label">Acres</span>
                <input class="ks-input red-num" type="text" inputmode="decimal" placeholder="0"
                  [value]="fieldInputDisplay('acres', r.acres)"
                  (input)="onFieldInput('acres', $any($event.target).value)"
                  (blur)="commitField('acres', $any($event.target))" />
              </label>
            </div>
          } @else {
            <p class="red-muted">No Loan Exposure Markers record found for this loan alias.</p>
          }
          @if (statusMessage()) {
            <p class="red-muted">{{ statusMessage() }}</p>
          }
          @if (error()) {
            <p class="red-error">{{ error() }}</p>
          }
        </div>
        <footer class="ks-modal__footer">
          <button type="button" class="ks-btn ks-btn--accent" (click)="close()" [disabled]="isSaving()">Cancel</button>
          <button type="button" class="ks-btn ks-btn--accent" (click)="saveAndClose()" [disabled]="isSaving() || !record()">
            {{ isSaving() ? 'Saving…' : 'Save and Close' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class PropertyStatsEditDialogComponent implements OnInit {
  private readonly securityValueApi = inject(LoanSecurityValueApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly loanAliasKey = input.required<number>();
  readonly loanAliasName = input.required<string>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly record = signal<PropertyStatsRecord | null>(null);
  /** Raw in-progress text per field (avoids reformat-on-keystroke). */
  private readonly fieldText = signal<Partial<Record<EditableField, string>>>({});
  private original: EditableValues | null = null;
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly statusMessage = signal('');
  readonly error = signal('');

  ngOnInit(): void {
    const aliasName = this.loanAliasName().trim().toLowerCase();
    const matches = (row: LoanSecurityValueDto) =>
      Number(row.loanAliasId ?? row.loanAliasKey ?? 0) === this.loanAliasKey() ||
      row.loanAliasName?.trim().toLowerCase() === aliasName;

    this.securityValueApi
      .getSecurityValues([this.loanAliasKey()], [])
      .pipe(
        map((rows) => rows.find(matches) ?? null),
        switchMap((row) =>
          row ? of(row) : this.securityValueApi.getSecurityValues([], []).pipe(map((all) => all.find(matches) ?? null)),
        ),
      )
      .subscribe({
        next: (row) => {
          const record = row ? this.toRecord(row) : null;
          this.record.set(record);
          this.original = record
            ? { securityValue: record.securityValue, units: record.units, squareFeet: record.squareFeet, acres: record.acres }
            : null;
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(extractApiError(err, 'Unable to load Security Value page data. Verify API availability.'));
          this.isLoading.set(false);
        },
      });
  }

  formatCurrency(value: number | null): string {
    return value == null || !Number.isFinite(value) ? '—' : formatCurrencyDisplay(value, 0);
  }

  fieldInputDisplay(field: EditableField, value: number | null): string {
    const pending = this.fieldText()[field];
    if (pending !== undefined) {
      return pending;
    }
    if (value == null || !Number.isFinite(value)) {
      return '';
    }
    if (field === 'securityValue') {
      return formatCurrencyDisplay(value, 0);
    }
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: field === 'units' ? 0 : 4 }).format(value);
  }

  onFieldInput(field: EditableField, rawValue: string): void {
    this.fieldText.update((current) => ({ ...current, [field]: rawValue }));
    this.clearMessages();
  }

  commitField(field: EditableField, inputEl: HTMLInputElement): void {
    const raw = this.fieldText()[field] ?? inputEl.value;
    const parsed =
      field === 'securityValue'
        ? parseCurrencyInput(raw)
        : parseNumericInput(raw, field !== 'units');
    this.record.update((current) => (current ? { ...current, [field]: parsed } : current));
    this.fieldText.update((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    inputEl.value = this.fieldInputDisplay(field, parsed);
  }

  saveAndClose(): void {
    if (this.isSaving()) {
      return;
    }
    this.commitPendingText();
    const r = this.record();
    if (!r) {
      return;
    }
    if (!this.hasChanged(r)) {
      this.statusMessage.set('No changes detected to save.');
      return;
    }
    const updatedBy = this.currentAppUser.getUpdatedBy();
    if (!updatedBy) {
      this.error.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isSaving.set(true);
    this.clearMessages();
    this.securityValueApi
      .saveSecurityValues({
        loanSecurityValues: [
          {
            loanAliasId: r.loanAliasId,
            securityValue: r.securityValue,
            units: r.units,
            squareFeet: r.squareFeet,
            acres: r.acres,
            updatedBy,
          },
        ],
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.error.set(extractApiError(err, 'Unable to save Security Value changes.'));
        },
      });
  }

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  /** Apply any text still being typed (Save clicked without blurring the field). */
  private commitPendingText(): void {
    const pending = this.fieldText();
    const fields = Object.keys(pending) as EditableField[];
    if (!fields.length) {
      return;
    }
    this.record.update((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current };
      for (const field of fields) {
        const raw = pending[field] ?? '';
        next[field] = field === 'securityValue' ? parseCurrencyInput(raw) : parseNumericInput(raw, field !== 'units');
      }
      return next;
    });
    this.fieldText.set({});
  }

  private hasChanged(r: PropertyStatsRecord): boolean {
    const o = this.original;
    if (!o) {
      return true;
    }
    const same = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);
    return (
      !same(r.securityValue, o.securityValue) ||
      !same(r.units, o.units) ||
      !same(r.squareFeet, o.squareFeet) ||
      !same(r.acres, o.acres)
    );
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.error.set('');
  }

  private toRecord(row: LoanSecurityValueDto): PropertyStatsRecord {
    const num = (value: unknown) => {
      const parsed = value == null || value === '' ? null : Number(value);
      return parsed != null && Number.isFinite(parsed) ? parsed : null;
    };
    return {
      loanAliasId: Number(row.loanAliasId ?? row.loanAliasKey ?? this.loanAliasKey()),
      loanAliasName: row.loanAliasName?.trim() || this.loanAliasName(),
      collateralPerYardi: num(row.collateralPerYardi ?? row.collateralValue),
      securityValue: num(row.securityValue),
      units: num(row.units),
      squareFeet: num(row.squareFeet),
      acres: num(row.acres),
    };
  }
}
