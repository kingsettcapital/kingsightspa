import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';

import { CurrentAppUserService } from '../../../core/services/current-app-user.service';
import { LoanDto, LoansApiService } from '../../../core/services/loans-api.service';
import { extractApiError } from '../../../core/utils/api-error.util';

type RankingRow = {
  loanKey: number;
  loanCode: string;
  loanDesc: string;
  investorAlias: string;
  loanAliasKey: number;
  ranking: number;
  dummyLoanLink: string;
  lateInterestApplicable: boolean;
  lateInterestOffNote: string;
};

/** Loan Attribute Assignment fields for every loan code under the report's loan alias. */
@Component({
  selector: 'app-ranking-edit-dialog',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './report-edit-dialog.css',
  template: `
    <div class="ks-modal-backdrop" (click)="close()">
      <div class="ks-modal red-modal red-modal--wide" role="dialog" aria-modal="true" aria-labelledby="rkEditTitle" (click)="$event.stopPropagation()">
        <header class="ks-modal__header">
          <h2 class="ks-modal__title" id="rkEditTitle">Edit Ranking — {{ loanAliasName() }}</h2>
          <button type="button" class="ks-modal__close" (click)="close()" aria-label="Close">×</button>
        </header>
        <div class="ks-modal__body">
          @if (isLoading()) {
            <p class="red-muted">Loading loan attributes…</p>
          } @else if (rows().length === 0) {
            <p class="red-muted">No loan codes found for this loan alias.</p>
          } @else {
            <div class="red-table-wrap">
              <table class="red-table">
                <thead>
                  <tr>
                    <th>Loan Code</th>
                    <th>Loan Name</th>
                    <th>Investor Alias</th>
                    <th>Ranking</th>
                    <th>Dummy Loan Link</th>
                    <th>Late Interest Applicable</th>
                    <th>Late Interest Off Note</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of rows(); track row.loanKey) {
                    <tr>
                      <td>{{ row.loanCode }}</td>
                      <td>{{ row.loanDesc }}</td>
                      <td>{{ row.investorAlias }}</td>
                      <td>
                        <input class="ks-input red-rank-input" type="text" inputmode="numeric" placeholder="0"
                          [value]="row.ranking > 0 ? row.ranking : ''"
                          (input)="patch(row.loanKey, { ranking: toRanking($any($event.target).value) })" />
                      </td>
                      <td>
                        <select class="ks-select" [value]="row.dummyLoanLink"
                          (change)="patch(row.loanKey, { dummyLoanLink: $any($event.target).value.trim() })">
                          <option value="" [selected]="!row.dummyLoanLink">— None —</option>
                          @for (code of dummyLinkOptions(); track code) {
                            <option [value]="code" [selected]="code === row.dummyLoanLink">{{ code }}</option>
                          }
                        </select>
                      </td>
                      <td>
                        <input type="checkbox" [checked]="row.lateInterestApplicable"
                          (change)="patch(row.loanKey, { lateInterestApplicable: $any($event.target).checked })" />
                      </td>
                      <td>
                        <input class="ks-input" type="text" placeholder="Enter note" [value]="row.lateInterestOffNote"
                          (input)="patch(row.loanKey, { lateInterestOffNote: $any($event.target).value })" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
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
          <button type="button" class="ks-btn ks-btn--accent" (click)="saveAndClose()" [disabled]="isSaving() || rows().length === 0">
            {{ isSaving() ? 'Saving…' : 'Save and Close' }}
          </button>
        </footer>
      </div>
    </div>
  `,
})
export class RankingEditDialogComponent implements OnInit {
  private readonly loansApi = inject(LoansApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly loanAliasKey = input.required<number>();
  readonly loanAliasName = input.required<string>();
  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly rows = signal<RankingRow[]>([]);
  private readonly allLoanCodes = signal<string[]>([]);
  private original = new Map<number, RankingRow>();
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly statusMessage = signal('');
  readonly error = signal('');

  readonly dummyLinkOptions = computed(() => this.allLoanCodes());

  ngOnInit(): void {
    const aliasName = this.loanAliasName().trim().toLowerCase();
    this.loansApi.getLoans('loan_attribute').subscribe({
      next: (loans) => {
        this.allLoanCodes.set(
          [...new Set(loans.map((loan) => loan.loanCode?.trim()).filter((code): code is string => !!code))].sort(
            (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }),
          ),
        );
        const forAlias = loans.filter(
          (loan) =>
            Number(loan.loanAliasKey ?? 0) === this.loanAliasKey() ||
            (aliasName.length > 0 && loan.loanAliasName?.trim().toLowerCase() === aliasName),
        );
        const rows = forAlias
          .map((loan) => this.toRow(loan))
          .sort((a, b) => a.loanCode.localeCompare(b.loanCode, undefined, { sensitivity: 'base' }));
        this.rows.set(rows);
        this.original = new Map(rows.map((row) => [row.loanKey, { ...row }]));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load loan attributes.'));
        this.isLoading.set(false);
      },
    });
  }

  patch(loanKey: number, changes: Partial<RankingRow>): void {
    this.rows.update((rows) => rows.map((row) => (row.loanKey === loanKey ? { ...row, ...changes } : row)));
    this.statusMessage.set('');
    this.error.set('');
  }

  toRanking(value: string): number {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }

  saveAndClose(): void {
    if (!this.rows().length || this.isSaving()) {
      return;
    }
    const rows = this.rows().filter((row) => this.hasRowChanged(row));
    if (!rows.length) {
      this.statusMessage.set('No changes detected to save.');
      this.error.set('');
      return;
    }
    const missingAlias = rows.find((row) => !row.loanAliasKey || row.loanAliasKey <= 0);
    if (missingAlias) {
      this.error.set(`Loan ${missingAlias.loanCode} requires a Loan Alias selection before saving.`);
      return;
    }
    const userUpdatedBy = this.currentAppUser.getUpdatedBy();
    if (!userUpdatedBy) {
      this.error.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    this.isSaving.set(true);
    this.loansApi
      .updateLoanAttributesBulk({
        loans: rows.map((row) => ({
          loanKey: row.loanKey,
          loanCode: row.loanCode,
          loanAliasKey: row.loanAliasKey,
          loanRanking: this.normalizeRanking(row.ranking),
          dummyLoanLink: row.dummyLoanLink,
          isLoanInterestApplicable: row.lateInterestApplicable,
          lateInterestOffNote: row.lateInterestOffNote.trim(),
          userUpdatedBy,
        })),
        auditProfile: 'loan_attribute',
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.saved.emit();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.error.set(extractApiError(err, 'Unable to save loan attributes.'));
        },
      });
  }

  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  private normalizeRanking(ranking: number): number {
    const asWholeNumber = Number.isFinite(ranking) ? Math.trunc(ranking) : 0;
    return Math.min(32767, Math.max(0, asWholeNumber));
  }

  private hasRowChanged(row: RankingRow): boolean {
    const original = this.original.get(row.loanKey);
    if (!original) {
      return true;
    }
    return (
      this.normalizeRanking(row.ranking) !== this.normalizeRanking(original.ranking) ||
      row.dummyLoanLink.trim() !== original.dummyLoanLink.trim() ||
      row.lateInterestApplicable !== original.lateInterestApplicable ||
      row.lateInterestOffNote.trim() !== original.lateInterestOffNote.trim()
    );
  }

  private toRow(loan: LoanDto): RankingRow {
    const ranking = Number(loan.loanRanking);
    return {
      loanKey: loan.loanKey,
      loanCode: loan.loanCode?.trim() ?? '',
      loanDesc: loan.loanDesc?.trim() || '—',
      investorAlias: loan.investorAliasName?.trim() || '—',
      loanAliasKey: Number(loan.loanAliasKey) > 0 ? Number(loan.loanAliasKey) : this.loanAliasKey(),
      ranking: Number.isFinite(ranking) && ranking > 0 ? Math.trunc(ranking) : 0,
      dummyLoanLink: loan.dummyLoanLink?.trim() ?? '',
      lateInterestApplicable: loan.isLoanInterestApplicable ?? true,
      lateInterestOffNote: loan.lateInterestOffNote?.trim() ?? '',
    };
  }
}
