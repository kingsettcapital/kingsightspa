import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  BookOpen,
  Clock,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
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
      useValue: new LucideIconProvider({ X, BookOpen, Clock, Play, Trash2 }),
    },
  ],
  templateUrl: './saved-queries-modal.component.html',
  styleUrl: './saved-queries-modal.component.scss',
})
export class SavedQueriesModalComponent {
  readonly isOpen = input(false);
  readonly queries = input<SavedQuery[]>([]);

  readonly closed = output<void>();
  readonly querySelected = output<SavedQuery>();
  readonly queryDeleted = output<SavedQuery>();

  readonly closeIcon = X;
  readonly bookIcon = BookOpen;
  readonly clockIcon = Clock;
  readonly playIcon = Play;
  readonly trashIcon = Trash2;

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  runQuery(query: SavedQuery): void {
    this.querySelected.emit(query);
    this.close();
  }

  deleteQuery(query: SavedQuery): void {
    this.queryDeleted.emit(query);
  }

  filterCount(query: SavedQuery): number {
    return query.filters.filter((f) => isFilterApplied(f)).length;
  }
}
