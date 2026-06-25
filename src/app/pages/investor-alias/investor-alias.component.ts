import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';

import { CurrentAppUserService } from '../../core/services/current-app-user.service';
import {
  InvestorAlias,
  InvestorAliasCreateRequest,
  InvestorAliasUpdateRequest,
  InvestorApiService,
} from '../../core/services/investor-api.service';

type InvestorAliasColumnKey =
  | 'investorAliasId'
  | 'investorAliasName'
  | 'updatedBy'
  | 'updatedDtm'
  | 'createdBy'
  | 'createdDtm';

type InvestorAliasTableColumn = {
  key: InvestorAliasColumnKey;
  label: string;
};

const INVESTOR_ALIAS_TABLE_COLUMNS: InvestorAliasTableColumn[] = [
  { key: 'investorAliasId', label: 'ID' },
  { key: 'investorAliasName', label: 'Alias Name' },
  { key: 'updatedBy', label: 'Modified By' },
  { key: 'updatedDtm', label: 'Modified Date' },
  { key: 'createdBy', label: 'Created By' },
  { key: 'createdDtm', label: 'Created Date' },
];

@Component({
  selector: 'app-investor-alias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './investor-alias.component.html',
  styleUrl: './investor-alias.component.css',
})
export class InvestorAliasComponent implements OnInit {
  private readonly investorApi = inject(InvestorApiService);
  private readonly currentAppUser = inject(CurrentAppUserService);

  readonly tableColumns = INVESTOR_ALIAS_TABLE_COLUMNS;

  readonly aliases = signal<InvestorAlias[]>([]);
  readonly searchTerm = signal('');
  readonly sortColumn = signal<InvestorAliasColumnKey | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  readonly showCreateDialog = signal(false);
  readonly showEditDialog = signal(false);
  readonly selectedAlias = signal<InvestorAlias | null>(null);
  readonly formName = signal('');

  readonly filteredAliases = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    let rows = this.aliases();
    if (term) {
      rows = rows.filter((alias) =>
        this.tableColumns.some((column) =>
          this.getCellDisplayValue(alias, column.key).toLowerCase().includes(term),
        ),
      );
    }

    const activeSort = this.sortColumn();
    if (activeSort) {
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      rows = [...rows].sort(
        (left, right) => this.compareAliases(left, right, activeSort) * direction,
      );
    }

    return rows;
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

  updateSearch(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    this.clearMessages();
  }

  toggleSort(column: InvestorAliasColumnKey): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
    this.currentPage.set(1);
  }

  sortIndicator(column: InvestorAliasColumnKey): string {
    if (this.sortColumn() !== column) {
      return '↕';
    }
    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  formatAuditDate(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  displayUserName(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
  }

  getCellDisplayValue(alias: InvestorAlias, column: InvestorAliasColumnKey): string {
    switch (column) {
      case 'investorAliasId':
        return String(alias.investorAliasId);
      case 'investorAliasName':
        return alias.investorAliasName;
      case 'updatedBy':
        return this.displayUserName(alias.updatedBy);
      case 'updatedDtm':
        return this.formatAuditDate(alias.updatedDtm);
      case 'createdBy':
        return this.displayUserName(alias.createdBy);
      case 'createdDtm':
        return this.formatAuditDate(alias.createdDtm);
      default:
        return '';
    }
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

  createAlias(): void {
    const name = this.formName().trim();
    if (!name || this.isSaving()) return;

    const createdBy = this.currentAppUser.getUpdatedBy();
    if (!createdBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const payload: InvestorAliasCreateRequest = {
      investorAliasName: name,
      createdBy,
    };

    this.isSaving.set(true);
    this.investorApi.createAlias(payload).subscribe({
      next: (created) => {
        const record = this.normalizeAlias(created ?? this.buildOptimisticCreateRecord(payload));
        this.aliases.set([...this.aliases(), record]);
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

    const updatedBy = this.currentAppUser.getUpdatedBy();
    if (!updatedBy) {
      this.errorMessage.set(this.currentAppUser.registrationRequiredMessage);
      return;
    }

    const payload: InvestorAliasUpdateRequest = {
      investorAliasName: name,
      updatedBy,
    };

    this.isSaving.set(true);
    this.investorApi.updateAlias(selected.investorAliasId, payload).subscribe({
      next: (updated) => {
        const merged = this.normalizeAlias(
          updated ?? {
            ...selected,
            investorAliasName: payload.investorAliasName,
            updatedBy: payload.updatedBy,
            updatedDtm: new Date().toISOString(),
          },
        );
        this.aliases.set(
          this.aliases().map((a) =>
            a.investorAliasId === merged.investorAliasId ? merged : a,
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

  private loadAliases(): void {
    this.isLoading.set(true);
    this.clearMessages();

    this.investorApi.getAllAliases().subscribe({
      next: (data) => {
        this.aliases.set(data.map((record) => this.normalizeAlias(record)));
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Unable to load investor aliases. Please verify API availability.');
        this.isLoading.set(false);
      },
    });
  }

  private compareAliases(
    left: InvestorAlias,
    right: InvestorAlias,
    column: InvestorAliasColumnKey,
  ): number {
    switch (column) {
      case 'investorAliasId':
        return left.investorAliasId - right.investorAliasId;
      case 'investorAliasName':
        return left.investorAliasName.localeCompare(right.investorAliasName, undefined, {
          sensitivity: 'base',
        });
      case 'updatedBy':
        return left.updatedBy.localeCompare(right.updatedBy, undefined, { sensitivity: 'base' });
      case 'createdBy':
        return left.createdBy.localeCompare(right.createdBy, undefined, { sensitivity: 'base' });
      case 'updatedDtm':
        return this.dateSortValue(left.updatedDtm) - this.dateSortValue(right.updatedDtm);
      case 'createdDtm':
        return this.dateSortValue(left.createdDtm) - this.dateSortValue(right.createdDtm);
      default:
        return 0;
    }
  }

  private dateSortValue(value: string | null | undefined): number {
    if (!value?.trim()) {
      return 0;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  private buildOptimisticCreateRecord(payload: InvestorAliasCreateRequest): InvestorAlias {
    const now = new Date().toISOString();
    return {
      investorAliasId: 0,
      investorAliasName: payload.investorAliasName,
      createdBy: payload.createdBy,
      createdDtm: now,
      updatedBy: '',
      updatedDtm: null,
    };
  }

  private normalizeAlias(record: InvestorAlias | Record<string, unknown>): InvestorAlias {
    const row = record as Record<string, unknown>;
    const createdBy = String(row['createdBy'] ?? row['created_by'] ?? '').trim();
    const updatedBy = String(row['updatedBy'] ?? row['updated_by'] ?? '').trim();
    const createdDtm = this.coerceDateString(
      row['createdDtm'] ?? row['created_datetime'] ?? row['created_dtm'] ?? row['created_date'],
    );
    const updatedDtm = this.coerceDateString(
      row['updatedDtm'] ?? row['updated_datetime'] ?? row['updated_dtm'] ?? row['updated_date'],
    );

    return {
      investorAliasId: Number(row['investorAliasId'] ?? row['investor_alias_id'] ?? 0),
      investorAliasName: String(row['investorAliasName'] ?? row['investor_alias_name'] ?? '').trim(),
      createdBy,
      createdDtm,
      updatedBy,
      updatedDtm,
    };
  }

  private coerceDateString(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    return String(value);
  }

  private clearMessages(): void {
    this.statusMessage.set('');
    this.errorMessage.set('');
  }
}
