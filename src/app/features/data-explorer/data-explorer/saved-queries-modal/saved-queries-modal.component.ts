import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  AlertCircle,
  BookOpen,
  BookmarkPlus,
  Clock,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  PenLine,
  Play,
  Trash2,
  X,
} from 'lucide-angular';

import { SavedQuery } from '../../interfaces/data-explorer.interfaces';
import { isFilterApplied } from '../../utils/data-explorer.utils';

@Component({
  selector: 'app-saved-queries-modal',
  standalone: true,
  imports: [DatePipe, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ X, BookOpen, BookmarkPlus, AlertCircle, Clock, PenLine, Play, Trash2 }),
    },
  ],
  templateUrl: './saved-queries-modal.component.html',
  styleUrl: './saved-queries-modal.component.scss',
})
export class SavedQueriesModalComponent {
  readonly isOpen = input(false);
  readonly queries = input<SavedQuery[]>([]);
  readonly loading = input(false);
  readonly actionLoading = input(false);
  readonly loadingQuery = input<{ id: string; name: string; mode: 'run' | 'edit' } | null>(null);
  readonly error = input<string | null>(null);

  readonly closed = output<void>();
  readonly querySelected = output<SavedQuery>();
  readonly queryEdit = output<SavedQuery>();
  readonly queryDeleted = output<SavedQuery>();

  readonly closeIcon = X;
  readonly bookIcon = BookOpen;
  readonly emptyIcon = BookmarkPlus;
  readonly errorIcon = AlertCircle;
  readonly clockIcon = Clock;
  readonly playIcon = Play;
  readonly editIcon = PenLine;
  readonly trashIcon = Trash2;

  readonly skeletonRows = [0, 1, 2];

  subtitleLabel(): string {
    if (this.loading()) {
      return 'Loading your saved queries…';
    }

    const loadingQuery = this.loadingQuery();
    if (this.actionLoading() && loadingQuery) {
      return loadingQuery.mode === 'edit'
        ? `Loading “${loadingQuery.name}” for edit…`
        : `Running “${loadingQuery.name}”…`;
    }

    const count = this.queries().length;
    return `${count} saved ${count === 1 ? 'query' : 'queries'}`;
  }

  actionLoadingLabel(): string {
    const loadingQuery = this.loadingQuery();
    if (!loadingQuery) {
      return 'Loading query…';
    }
    return loadingQuery.mode === 'edit'
      ? `Loading “${loadingQuery.name}” for edit…`
      : `Running “${loadingQuery.name}”…`;
  }

  isQueryLoading(queryId: string): boolean {
    return this.actionLoading() && this.loadingQuery()?.id === queryId;
  }

  skeletonLineWidth(row: number, line: number): string {
    const widths = ['72%', '48%', '36%', '58%', '42%'];
    return widths[(row + line) % widths.length];
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.actionLoading()) {
      return;
    }
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    if (this.actionLoading()) {
      return;
    }
    this.closed.emit();
  }

  runQuery(query: SavedQuery): void {
    if (this.actionLoading()) {
      return;
    }
    this.querySelected.emit(query);
  }

  editQuery(query: SavedQuery): void {
    if (this.actionLoading()) {
      return;
    }
    this.queryEdit.emit(query);
  }

  deleteQuery(query: SavedQuery): void {
    if (this.actionLoading()) {
      return;
    }
    this.queryDeleted.emit(query);
  }

  hasGroupBy(query: SavedQuery): boolean {
    return !!query.groupByFieldId?.trim();
  }

  filterCount(query: SavedQuery): number {
    const applied = query.filters.filter((f) => isFilterApplied(f)).length;
    if (applied > 0) {
      return applied;
    }
    return query.filterCount ?? 0;
  }

  columnCount(query: SavedQuery): number {
    if (query.selectedFieldIds.length > 0) {
      return query.selectedFieldIds.length;
    }
    return query.columnCount ?? 0;
  }
}
