import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { InvestorAlias, InvestorApiService } from '../../core/services/investor-api.service';

@Component({
  selector: 'app-investor-alias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor-alias.component.html',
  styleUrl: './investor-alias.component.css',
})
export class InvestorAliasComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);

  readonly aliases = signal<InvestorAlias[]>([]);
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
  readonly selectedAlias = signal<InvestorAlias | null>(null);
  readonly formName = signal('');

  readonly filteredAliases = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.aliases();
    return this.aliases().filter((a) =>
      a.investorAliasName.toLowerCase().includes(term),
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

    this.investorApi.getAllAliases().subscribe({
      next: (data) => {
        this.aliases.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load investor aliases. Please verify API availability.');
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

  openEditDialog(alias: InvestorAlias): void {
    this.selectedAlias.set({ ...alias });
    this.formName.set(alias.investorAliasName);
    this.clearMessages();
    this.showEditDialog.set(true);
  }

  closeEditDialog(): void {
    this.showEditDialog.set(false);
    this.formName.set('');
    this.selectedAlias.set(null);
  }

  openDeleteDialog(alias: InvestorAlias): void {
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

    const now = new Date().toISOString();
    const payload: InvestorAlias = {
      investorAliasId: 0,
      investorAliasName: name,
      createdBy: 'system',
      createdDtm: now,
      updatedBy: 'system',
      updatedDtm: now,
    };

    this.isSaving.set(true);
    this.investorApi.createAlias(payload).subscribe({
      next: (created) => {
        this.aliases.set([...this.aliases(), created ?? payload]);
        this.isSaving.set(false);
        this.closeCreateDialog();
        this.statusMessage.set('Investor alias created successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to create investor alias.');
        this.isSaving.set(false);
      },
    });
  }

  saveAlias(): void {
    const selected = this.selectedAlias();
    const name = this.formName().trim();
    if (!selected || !name || this.isSaving()) return;

    const payload: InvestorAlias = {
      ...selected,
      investorAliasName: name,
      updatedBy: 'system',
      updatedDtm: new Date().toISOString(),
    };

    this.isSaving.set(true);
    this.investorApi.updateAlias(payload).subscribe({
      next: (updated) => {
        const saved = updated ?? payload;
        this.aliases.set(
          this.aliases().map((a) =>
            a.investorAliasId === saved.investorAliasId ? saved : a,
          ),
        );
        this.isSaving.set(false);
        this.closeEditDialog();
        this.statusMessage.set('Investor alias updated successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to update investor alias.');
        this.isSaving.set(false);
      },
    });
  }

  deleteAlias(): void {
    const selected = this.selectedAlias();
    if (!selected || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.investorApi.deleteAlias(selected.investorAliasId).subscribe({
      next: () => {
        this.aliases.set(
          this.aliases().filter((a) => a.investorAliasId !== selected.investorAliasId),
        );
        this.isDeleting.set(false);
        this.closeDeleteDialog();
        this.statusMessage.set('Investor alias deleted successfully.');
      },
      error: () => {
        this.errorMessage.set('Failed to delete investor alias.');
        this.isDeleting.set(false);
        this.closeDeleteDialog();
      },
    });
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
