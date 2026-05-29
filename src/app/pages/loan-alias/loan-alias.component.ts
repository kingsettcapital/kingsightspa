import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import {
  LoanAlias,
  LoanAliasSaveRequest,
  LoanAliasApiService,
} from '../../core/services/loan-alias-api.service';

@Component({
  selector: 'app-loan-alias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loan-alias.component.html',
  styleUrl: './loan-alias.component.css',
})
export class LoanAliasComponent implements OnInit {
  private readonly loanAliasApi = inject(LoanAliasApiService);

  readonly aliases = signal<LoanAlias[]>([]);
  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  readonly showCreateDialog = signal(false);
  readonly showEditDialog = signal(false);
  readonly showDeleteDialog = signal(false);
  readonly selectedAlias = signal<LoanAlias | null>(null);

  readonly formName = signal('');

  readonly filteredAliases = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.aliases();
    return this.aliases().filter((a) =>
      a.loanAliasName.toLowerCase().includes(term),
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAliases().length / this.pageSize)),
  );

  readonly paginatedAliases = computed(() => {
    const filtered = this.filteredAliases();
    const maxPage = this.totalPages();
    const safePage = Math.max(1, Math.min(this.currentPage(), maxPage));
    if (safePage !== this.currentPage()) {
      queueMicrotask(() => this.currentPage.set(safePage));
    }
    const start = (safePage - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  readonly pageRangeLabel = computed(() => {
    const total = this.filteredAliases().length;
    if (total === 0) return '0–0 of 0';
    const maxPage = this.totalPages();
    const safePage = Math.max(1, Math.min(this.currentPage(), maxPage));
    const start = (safePage - 1) * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, total);
    return `${start}–${end} of ${total}`;
  });

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );

  ngOnInit(): void {
    this.loadAliases();
  }

  private loadAliases(): void {
    this.isLoading.set(true);
    this.clearMessages();

    this.loanAliasApi.getAll().subscribe({
      next: (data) => {
        this.aliases.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load loan aliases. Please verify API availability.');
        this.isLoading.set(false);
      },
    });
  }

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  goToPreviousPage(): void {
    this.currentPage.set(Math.max(1, this.currentPage() - 1));
  }

  goToNextPage(): void {
    this.currentPage.set(Math.min(this.totalPages(), this.currentPage() + 1));
  }

  openCreateDialog(): void {
    this.formName.set('');
    this.clearMessages();
    this.showCreateDialog.set(true);
  }

  closeCreateDialog(): void {
    this.showCreateDialog.set(false);
    this.formName.set('');
  }

  openEditDialog(alias: LoanAlias): void {
    this.selectedAlias.set({ ...alias });
    this.formName.set(alias.loanAliasName);
    this.clearMessages();
    this.showEditDialog.set(true);
  }

  closeEditDialog(): void {
    this.showEditDialog.set(false);
    this.formName.set('');
    this.selectedAlias.set(null);
  }

  openDeleteDialog(alias: LoanAlias): void {
    this.selectedAlias.set(alias);
    this.clearMessages();
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedAlias.set(null);
  }

  createAlias(): void {
    const name = this.formName().trim();
    if (!name || this.isSaving()) return;

    const payload: LoanAliasSaveRequest = {
      loanAliasName: name,
      createdBy: 'system',
      updatedBy: 'system',
    };

    this.isSaving.set(true);
    this.loanAliasApi.create(payload).subscribe({
      next: (created) => {
        const record = created ?? this.buildOptimisticRecord(payload);
        this.aliases.set([...this.aliases(), record]);
        this.isSaving.set(false);
        this.closeCreateDialog();
        this.statusMessage.set('Loan alias created successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to create loan alias.');
        this.isSaving.set(false);
      },
    });
  }

  saveAlias(): void {
    const selected = this.selectedAlias();
    const name = this.formName().trim();
    if (!selected || !name || this.isSaving()) return;

    const payload: LoanAliasSaveRequest = {
      loanAliasName: name,
      createdBy: selected.createdBy,
      updatedBy: 'system',
    };

    this.isSaving.set(true);
    this.loanAliasApi.update(selected.loanAliasId, payload).subscribe({
      next: (updated) => {
        const merged: LoanAlias = updated ?? {
          ...selected,
          loanAliasName: payload.loanAliasName,
          updatedBy: payload.updatedBy,
          updatedDtm: new Date().toISOString(),
        };
        this.aliases.set(
          this.aliases().map((a) => (a.loanAliasId === merged.loanAliasId ? merged : a)),
        );
        this.isSaving.set(false);
        this.closeEditDialog();
        this.statusMessage.set('Loan alias updated successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to update loan alias.');
        this.isSaving.set(false);
      },
    });
  }

  deleteAlias(): void {
    const selected = this.selectedAlias();
    if (!selected || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.loanAliasApi.delete(selected.loanAliasId).subscribe({
      next: () => {
        this.aliases.set(this.aliases().filter((a) => a.loanAliasId !== selected.loanAliasId));
        this.isDeleting.set(false);
        this.closeDeleteDialog();
        this.statusMessage.set('Loan alias deleted successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to delete loan alias.');
        this.isDeleting.set(false);
        this.closeDeleteDialog();
      },
    });
  }

  private buildOptimisticRecord(payload: LoanAliasSaveRequest): LoanAlias {
    return {
      loanAliasId: 0,
      loanAliasName: payload.loanAliasName,
      collateralValue: null,
      securityValue: null,
      createdBy: payload.createdBy,
      createdDtm: new Date().toISOString(),
      updatedBy: payload.updatedBy,
      updatedDtm: new Date().toISOString(),
    };
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
