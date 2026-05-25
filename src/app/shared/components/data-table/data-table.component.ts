import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChildren,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';
import {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingInfoState,
  ColumnSizingState,
  createAngularTable,
  getCoreRowModel,
  Header,
  Row,
  SortingState,
} from '@tanstack/angular-table';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
} from 'lucide-angular';

import { DataTableCellDirective } from './data-table-cell.directive';
import {
  DataTableBooleanFilterOption,
  DataTableColumnFilterConfig,
  isDataTableActionsColumn,
} from './data-table.types';

export type DataTableCellContext<TData> = {
  $implicit: TData;
  row: TData;
};

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, LucideAngularModule],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        Filter,
        ArrowUpDown,
        ArrowUp,
        ArrowDown,
      }),
    },
  ],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<TData extends object> {
  readonly title = input('');
  readonly tableClass = input('');
  readonly columns = input.required<ColumnDef<TData>[]>();
  readonly data = input.required<TData[]>();
  readonly sorting = input<SortingState>([]);
  readonly columnFilters = input<ColumnFiltersState>([]);
  readonly columnFilterConfig = input<Record<string, DataTableColumnFilterConfig>>({});
  readonly booleanFilterOptions = input<readonly DataTableBooleanFilterOption[]>([
    { value: '', label: 'All' },
    { value: 'true', label: 'TRUE' },
    { value: 'false', label: 'FALSE' },
  ]);

  readonly isLoading = input(false);
  readonly errorMessage = input('');
  readonly loadingMessage = input('Loading...');
  readonly emptyMessage = input('No records found.');

  readonly manualSorting = input(true);
  readonly manualFiltering = input(true);
  readonly enableColumnResizing = input(true);
  readonly scrollBody = input(true);

  readonly showPagination = input(true);
  readonly currentPage = input(1);
  readonly totalPages = input(1);
  readonly pageRangeLabel = input('');
  readonly visiblePages = input<number[]>([1]);

  readonly defaultColumnMinSize = input(120);
  readonly defaultColumnSize = input(160);
  readonly rowClassFn = input<(row: TData) => string | null>(() => null);

  readonly sortingChange = output<SortingState>();
  readonly columnFiltersChange = output<ColumnFiltersState>();
  readonly pagePrevious = output<void>();
  readonly pageNext = output<void>();
  readonly pageSelect = output<number>();

  readonly cellTemplates = contentChildren(DataTableCellDirective);

  readonly filterIcon = Filter;
  readonly sortIconDefault = ArrowUpDown;
  readonly sortIconAsc = ArrowUp;
  readonly sortIconDesc = ArrowDown;

  readonly openFilterColumnId = signal<string | null>(null);
  readonly filterDraft = signal('');
  readonly filterMenuAnchor = signal<DOMRect | null>(null);

  readonly columnSizing = signal<ColumnSizingState>({});
  readonly columnSizingInfo = signal<ColumnSizingInfoState>({
    columnSizingStart: [],
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    startOffset: null,
    startSize: null,
  });

  private readonly filterMenuWidthPx = 216;
  private readonly filterMenuEstimatedHeightPx = 200;
  private readonly filterMenuGapPx = 6;
  private readonly filterMenuViewportPaddingPx = 8;

  readonly filterMenuPosition = computed(() => {
    const rect = this.filterMenuAnchor();
    if (!rect) {
      return null;
    }

    const width = this.filterMenuWidthPx;
    const height = this.filterMenuEstimatedHeightPx;
    const pad = this.filterMenuViewportPaddingPx;
    const gap = this.filterMenuGapPx;

    let left = rect.right - width;
    if (left < pad) {
      left = rect.left;
    }
    if (left + width > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - width - pad);
    }

    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - height - gap);
    }

    return { top, left };
  });

  readonly table = createAngularTable<TData>(() => ({
    data: this.data(),
    columns: this.columns(),
    state: {
      sorting: this.sorting(),
      columnFilters: this.columnFilters(),
      columnSizing: this.columnSizing(),
      columnSizingInfo: this.columnSizingInfo(),
    },
    onSortingChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(this.sorting()) : updater;
      this.sortingChange.emit(next);
    },
    onColumnFiltersChange: (updater) => {
      const next =
        typeof updater === 'function' ? updater(this.columnFilters()) : updater;
      this.columnFiltersChange.emit(next);
    },
    onColumnSizingChange: (updater) => {
      this.columnSizing.set(
        typeof updater === 'function' ? updater(this.columnSizing()) : updater,
      );
    },
    onColumnSizingInfoChange: (updater) => {
      this.columnSizingInfo.set(
        typeof updater === 'function' ? updater(this.columnSizingInfo()) : updater,
      );
    },
    manualSorting: this.manualSorting(),
    manualFiltering: this.manualFiltering(),
    enableColumnResizing: this.enableColumnResizing(),
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: {
      minSize: this.defaultColumnMinSize(),
      size: this.defaultColumnSize(),
    },
  }));

  readonly tableColumnCount = computed(() => this.columns().length);

  readonly columnSizeVars = computed<Record<string, number>>(() => {
    this.columnSizing();
    this.columnSizingInfo();

    const headers = this.table.getFlatHeaders();
    const sizes: Record<string, number> = {};

    for (let index = headers.length - 1; index >= 0; index -= 1) {
      const header = headers[index]!;
      sizes[`--header-${header.id}-size`] = header.getSize();
      sizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }

    return sizes;
  });

  readonly wrapClasses = computed(() => {
    const classes = ['ks-table-wrap'];
    if (this.scrollBody()) {
      classes.push('ks-table-wrap--scroll-body');
    }
    return classes.join(' ');
  });

  readonly tableClasses = computed(() => {
    const classes = ['ks-table', 'ks-table--tanstack'];
    const extra = this.tableClass().trim();
    if (extra) {
      classes.push(extra);
    }
    return classes.join(' ');
  });

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeFilterMenu();
  }

  getHeaderLabel(header: Header<TData, unknown>): string {
    const label = header.column.columnDef.header;
    return typeof label === 'string' ? label : '';
  }

  headerWidthStyle(headerId: string): string {
    return `calc(var(--header-${headerId}-size) * 1px)`;
  }

  columnWidthStyle(columnId: string): string {
    return `calc(var(--col-${columnId}-size) * 1px)`;
  }

  isActionsHeader(columnId: string): boolean {
    return isDataTableActionsColumn(columnId);
  }

  canSortColumn(header: Header<TData, unknown>): boolean {
    return header.column.getCanSort();
  }

  canFilterColumn(header: Header<TData, unknown>): boolean {
    return header.column.getCanFilter();
  }

  canResizeColumn(header: Header<TData, unknown>): boolean {
    return header.column.getCanResize();
  }

  getRowClasses(row: Row<TData>): string | null {
    return this.rowClassFn()(row.original);
  }

  getCellTemplate(columnId: string) {
    return (
      this.cellTemplates().find((entry) => entry.columnId() === columnId)?.templateRef ??
      null
    );
  }

  getCellContext(row: Row<TData>): DataTableCellContext<TData> {
    return {
      $implicit: row.original,
      row: row.original,
    };
  }

  closeFilterMenu(): void {
    this.openFilterColumnId.set(null);
    this.filterMenuAnchor.set(null);
  }

  getFilterPlaceholder(columnId: string): string {
    return this.columnFilterConfig()[columnId]?.placeholder ?? 'Enter value...';
  }

  isBooleanFilterColumn(columnId: string): boolean {
    return this.columnFilterConfig()[columnId]?.type === 'boolean';
  }

  isDateFilterColumn(columnId: string): boolean {
    return this.columnFilterConfig()[columnId]?.type === 'date';
  }

  getColumnFilterValue(columnId: string): string {
    const value = this.table.getColumn(columnId)?.getFilterValue();
    return value === undefined || value === null ? '' : String(value);
  }

  hasActiveColumnFilter(columnId: string): boolean {
    return this.getColumnFilterValue(columnId).trim().length > 0;
  }

  isFilterMenuOpen(columnId: string): boolean {
    return this.openFilterColumnId() === columnId;
  }

  getOpenFilterColumnLabel(): string {
    const columnId = this.openFilterColumnId();
    if (!columnId) {
      return '';
    }
    const column = this.columns().find((entry) => entry.id === columnId);
    return typeof column?.header === 'string' ? column.header : columnId;
  }

  toggleFilterMenu(event: Event, columnId: string): void {
    event.stopPropagation();
    if (this.openFilterColumnId() === columnId) {
      this.closeFilterMenu();
      return;
    }

    const target = event.currentTarget;
    if (target instanceof HTMLElement) {
      this.filterMenuAnchor.set(target.getBoundingClientRect());
    }

    this.openFilterColumnId.set(columnId);
    const currentValue = this.getColumnFilterValue(columnId);
    this.filterDraft.set(
      this.isDateFilterColumn(columnId) ? this.toDateInputValue(currentValue) : currentValue,
    );
  }

  setFilterDraft(value: string): void {
    this.filterDraft.set(value);
  }

  applyColumnFilter(columnId: string): void {
    this.setColumnFilterValue(columnId, this.filterDraft().trim());
    this.closeFilterMenu();
  }

  clearColumnFilter(columnId: string): void {
    this.filterDraft.set('');
    this.setColumnFilterValue(columnId, '');
    this.closeFilterMenu();
  }

  getSortDirection(columnId: string): false | 'asc' | 'desc' {
    const column = this.table.getColumn(columnId);
    const sorted = column?.getIsSorted();
    return sorted === 'asc' || sorted === 'desc' ? sorted : false;
  }

  toggleColumnSort(event: Event, columnId: string): void {
    event.stopPropagation();
    const column = this.table.getColumn(columnId);
    const handler = column?.getToggleSortingHandler();
    handler?.(event);
  }

  private setColumnFilterValue(columnId: string, value: string): void {
    const column = this.table.getColumn(columnId);
    if (!column) {
      return;
    }
    column.setFilterValue(value || undefined);
    this.columnFiltersChange.emit(this.table.getState().columnFilters);
  }

  private toDateInputValue(value: string): string {
    if (!value || value === '-') {
      return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().slice(0, 10);
  }
}
