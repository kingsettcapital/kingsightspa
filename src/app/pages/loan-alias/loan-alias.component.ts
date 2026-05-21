import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { LoanApiRecord, LoansApiService } from '../../core/services/loans-api.service';

@Component({
  selector: 'app-loan-alias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loan-alias.component.html',
  styleUrl: './loan-alias.component.css',
})
export class LoanAliasComponent {
  private readonly loansApi = inject(LoansApiService);

  readonly searchText = signal('');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly infoMessage = signal('Type a loan description and click Search.');
  readonly loans = signal<LoanOption[]>([]);
  readonly selectedLoanKey = signal<string | null>(null);
  readonly selectedLoanDesc = signal<string>('');

  updateSearchText(value: string): void {
    this.searchText.set(value);
  }

  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchLoans();
    }
  }

  clearSearch(): void {
    this.searchText.set('');
    this.loans.set([]);
    this.selectedLoanKey.set(null);
    this.selectedLoanDesc.set('');
    this.errorMessage.set('');
    this.infoMessage.set('Type a loan description and click Search.');
  }

  searchLoans(): void {
    const searchTerm = this.searchText().trim().toLowerCase();
    this.resetSelection();
    this.errorMessage.set('');
    this.infoMessage.set('Searching loans...');
    this.isLoading.set(true);

    this.loansApi.getLoans().subscribe({
      next: (response) => {
        const normalizedLoans = response.map(this.normalizeLoan).filter(this.isValidLoan);

        const filteredLoans = searchTerm
          ? normalizedLoans.filter((loan) =>
              loan.loanDesc.toLowerCase().includes(searchTerm)
            )
          : normalizedLoans;

        this.loans.set(filteredLoans);
        if (filteredLoans.length === 0) {
          this.infoMessage.set('No matching loans found.');
        } else {
          this.infoMessage.set(`${filteredLoans.length} loan(s) found.`);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set(
          'Unable to fetch loans right now. Please check API availability.'
        );
        this.infoMessage.set('');
        this.loans.set([]);
        this.isLoading.set(false);
      },
    });
  }

  selectLoan(loan: LoanOption): void {
    this.selectedLoanKey.set(loan.loanKey);
    this.selectedLoanDesc.set(loan.loanDesc);
  }

  private resetSelection(): void {
    this.selectedLoanKey.set(null);
    this.selectedLoanDesc.set('');
  }

  private normalizeLoan(loan: LoanApiRecord): LoanOption {
    const loanDesc = this.readValue(loan, ['LoanDesc', 'loanDesc']);
    const loanKey = this.readValue(loan, ['LoanKey', 'loanKey']);
    return {
      loanDesc,
      loanKey,
    };
  }

  private isValidLoan(loan: LoanOption): boolean {
    return loan.loanDesc.length > 0 && loan.loanKey.length > 0;
  }

  private readValue(record: LoanApiRecord, keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim().length > 0) {
        return String(value).trim();
      }
    }
    return '';
  }
}

type LoanOption = {
  loanDesc: string;
  loanKey: string;
};
