import { Component, computed, DestroyRef, effect, inject, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Home,
  LayoutGrid,
  Layers,
  LineChart,
  LUCIDE_ICONS,
  LucideAngularModule,
  LucideIconProvider,
  PenLine,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-angular';
import { catchError, debounceTime, of, Subject } from 'rxjs';

import { ExcelService } from '../../../core/services/excel.service';
import {
  FILTER_OPERATORS,
  QUICK_START_TEMPLATES,
  DATA_EXPLORER_DEFAULT_PAGE_SIZE,
  DATA_EXPLORER_PAGE_SIZE_OPTIONS,
} from '../constants/data-explorer.constants';
import { DataExplorerProductDto, DataExplorerRow } from '../interfaces/data-explorer-api.models';
import {
  DataGroup,
  DataProduct,
  DataProductField,
  FilterLogic,
  FilterOperator,
  QueryFilter,
  QuickStartTemplate,
  SavedQuery,
  SaveQueryPayload,
} from '../interfaces/data-explorer.interfaces';
import { DataExplorerService } from '../services/data-explorer.service';
import { DataExplorerApiService } from '../services/data-explorer-api.service';
import {
  DataExplorerCacheActions,
  DataExplorerColumnsApiActions,
  DataExplorerRowsApiActions,
} from '../store/data-explorer.actions';
import {
  selectDataExplorerColumns,
  selectDataExplorerRowsList,
} from '../store/data-explorer.selectors';
import {
  formatCellValue,
  generateFilterId,
  getFieldById,
  getRecordValue,
  getRowKey,
  getTypeBadge,
  getTypeBadgeClass,
  groupRecords,
  isFilterApplied,
} from '../utils/data-explorer.utils';
import { KsCurrencyPipe } from '../../../shared/pipes/ks-currency.pipe';
import { SaveQueryModalComponent } from './save-query-modal/save-query-modal.component';
import { SavedQueriesModalComponent } from './saved-queries-modal/saved-queries-modal.component';

const VISIBLE_PAGE_BUTTON_COUNT = 3;

@Component({
  selector: 'app-data-explorer',
  standalone: true,
  imports: [
    FormsModule,
    KsCurrencyPipe,
    LucideAngularModule,
    RouterLink,
    SaveQueryModalComponent,
    SavedQueriesModalComponent,
  ],
  providers: [
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({
        RotateCcw,
        PenLine,
        BookOpen,
        Save,
        Download,
        Columns3,
        SlidersHorizontal,
        Search,
        ChevronDown,
        ChevronLeft,
        ChevronRight,
        LayoutGrid,
        Layers,
        Building2,
        Users,
        LineChart,
        ArrowLeftRight,
        Trash2,
        Home,
      }),
    },
  ],
  templateUrl: './data-explorer.component.html',
  styleUrl: './data-explorer.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DataExplorerComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly store = inject(Store);
  private readonly dataExplorerService = inject(DataExplorerService);
  private readonly dataExplorerApi = inject(DataExplorerApiService);
  private readonly excelService = inject(ExcelService);
  private readonly filterReload$ = new Subject<void>();
  private readonly pendingSavedQuery = signal<SavedQuery | null>(null);

  private readonly columnsState = this.store.selectSignal(selectDataExplorerColumns);
  private readonly rowsState = this.store.selectSignal(selectDataExplorerRowsList);

  readonly filterOperators = FILTER_OPERATORS;
  readonly pageSizeOptions = DATA_EXPLORER_PAGE_SIZE_OPTIONS;

  readonly dataProducts = computed(() => this.columnsState().products);
  readonly columnsLoading = computed(() => this.columnsState().loading);
  readonly columnsError = computed(() => this.columnsState().error);
  readonly apiRows = computed(() => this.rowsState().rows);
  readonly dataLoading = computed(() => this.rowsState().loading);
  readonly dataError = computed(() => this.rowsState().error);
  readonly totalCount = computed(() => this.rowsState().totalCount);
  readonly totalPages = computed(() => this.rowsState().totalPages);

  readonly quickStartTemplates = computed(() => {
    const availableFieldIds = new Set(this.allFields().map((field) => field.id));
    return QUICK_START_TEMPLATES.filter((template) =>
      template.fieldIds.every((fieldId) => availableFieldIds.has(fieldId)),
    );
  });

  readonly resetIcon = RotateCcw;
  readonly homeIcon = Home;
  readonly editIcon = PenLine;
  readonly savedIcon = BookOpen;
  readonly saveIcon = Save;
  readonly exportIcon = Download;
  readonly columnsIcon = Columns3;
  readonly filtersIcon = SlidersHorizontal;
  readonly trashIcon = Trash2;
  readonly searchIcon = Search;
  readonly chevronDownIcon = ChevronDown;
  readonly chevronLeftIcon = ChevronLeft;
  readonly chevronRightIcon = ChevronRight;
  readonly gridIcon = LayoutGrid;
  readonly dataProductsIcon = Layers;
  readonly buildingIcon = Building2;
  readonly usersIcon = Users;
  readonly lineChartIcon = LineChart;
  readonly transactionsIcon = ArrowLeftRight;

  readonly productIcons: Record<string, typeof Building2> = {
    investors: Users,
    fund: Building2,
    capital: LineChart,
    properties: Building2,
    tenants: Users,
    financials: LineChart,
    transactions: ArrowLeftRight,
  };

  readonly allFields = computed(() =>
    this.dataProducts().flatMap((product) => product.fields),
  );

  readonly productOptions = signal<DataExplorerProductDto[]>([]);
  readonly productsLoading = signal(true);
  readonly selectedProduct = signal('');

  readonly selectedFieldIds = signal<string[]>([]);
  readonly columnSearch = signal('');
  readonly expandedProducts = signal<string[]>([]);
  readonly filters = signal<QueryFilter[]>([]);
  readonly filterLogic = signal<FilterLogic>('and');
  readonly groupByFieldId = signal<string | null>(null);
  readonly sortFieldId = signal<string | null>(null);
  readonly sortDirection = signal<'asc' | 'desc'>('asc');
  readonly expandedGroupKeys = signal<string[]>([]);

  readonly isColumnsPanelOpen = signal(true);
  readonly isFiltersPanelOpen = signal(false);
  readonly isGroupByOpen = signal(false);
  readonly isSaveModalOpen = signal(false);
  readonly saveModalMode = signal<'create' | 'update'>('create');
  readonly isSavedModalOpen = signal(false);
  readonly savedQueries = signal<SavedQuery[]>([]);
  readonly savedQueriesLoading = signal(false);
  readonly savedQueriesError = signal<string | null>(null);
  readonly savedQueryActionLoading = signal(false);
  readonly loadingSavedQuery = signal<{ id: string; name: string; mode: 'run' | 'edit' } | null>(null);
  readonly editingSavedQuery = signal<Pick<SavedQuery, 'id' | 'name' | 'description'> | null>(null);
  readonly currentPage = signal(1);
  readonly pageSize = signal(DATA_EXPLORER_DEFAULT_PAGE_SIZE);

  readonly skeletonPanelGroups = [0, 1, 2];
  readonly skeletonPanelFields = [0, 1, 2, 3];

  readonly skeletonRowIndices = computed(() =>
    Array.from({ length: Math.min(this.pageSize(), 12) }, (_, index) => index),
  );

  readonly hasQuery = computed(() => this.selectedFieldIds().length > 0);
  readonly isEditingSavedQuery = computed(() => this.editingSavedQuery() != null);
  readonly selectedFields = computed(() => {
    const ids = new Set(this.selectedFieldIds());
    return this.allFields().filter((field) => ids.has(field.id));
  });

  readonly selectedFieldsByProduct = computed(() => {
    const ids = new Set(this.selectedFieldIds());
    return this.dataProducts()
      .map((product) => ({
        ...product,
        fields: product.fields.filter((field) => ids.has(field.id)),
      }))
      .filter((product) => product.fields.length > 0);
  });

  readonly filteredFieldsForSearch = computed(() => {
    const query = this.columnSearch().trim().toLowerCase();
    const products = this.dataProducts();
    if (!query) {
      return products;
    }

    return products
      .map((product) => ({
        ...product,
        fields: product.fields.filter((field) =>
          field.label.toLowerCase().includes(query),
        ),
      }))
      .filter((product) => product.fields.length > 0);
  });

  readonly displayColumns = computed(() => {
    const groupBy = this.groupByFieldId();
    if (!groupBy) {
      return this.selectedFields();
    }
    return this.selectedFields().filter((field) => field.id !== groupBy);
  });

  readonly groupByOptions = computed(() => [
    { id: null as string | null, label: 'None' },
    ...this.selectedFields().map((field) => ({ id: field.id, label: field.label })),
  ]);

  readonly groupByLabel = computed(() => {
    const id = this.groupByFieldId();
    if (!id) {
      return 'None';
    }
    return getFieldById(this.allFields(), id)?.label ?? 'None';
  });

  readonly filteredRecords = computed(() => this.apiRows());

  readonly sortedRecords = computed(() => {
    const records = [...this.filteredRecords()];
    const sortFieldId = this.sortFieldId();
    if (!sortFieldId) {
      return records;
    }

    const field = getFieldById(this.allFields(), sortFieldId);
    if (!field) {
      return records;
    }

    const direction = this.sortDirection();
    return records.sort((a, b) => {
      const aVal = getRecordValue(a, field);
      const bVal = getRecordValue(b, field);
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return direction === 'asc' ? cmp : -cmp;
    });
  });

  readonly tableGroups = computed((): DataGroup[] => {
    const groupByField = this.groupByFieldId()
      ? getFieldById(this.allFields(), this.groupByFieldId()!)
      : null;

    const groupsMap = groupRecords(this.sortedRecords(), groupByField ?? null);
    const expanded = new Set(this.expandedGroupKeys());

    if (!groupByField) {
      return [
        {
          key: '__flat__',
          label: '',
          records: this.sortedRecords(),
          expanded: true,
        },
      ];
    }

    return Array.from(groupsMap.entries()).map(([key, records]) => ({
      key,
      label: `${groupByField.label}: ${key}`,
      records,
      expanded: expanded.size === 0 || expanded.has(key),
    }));
  });

  readonly filterCardsCount = computed(() => this.filters().length);

  readonly appliedFilterCount = computed(
    () => this.filters().filter((filter) => isFilterApplied(filter)).length,
  );

  readonly totalRecords = computed(() => this.filteredRecords().length);
  readonly totalDataProducts = computed(() => this.dataProducts().length);
  readonly totalAvailableRecords = computed(() => this.totalCount() || this.apiRows().length);
  readonly showTableEmpty = computed(
    () =>
      this.hasQuery() &&
      !this.dataLoading() &&
      !this.dataError() &&
      this.totalRecords() === 0,
  );

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= VISIBLE_PAGE_BUTTON_COUNT) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    let start = Math.max(1, current - 1);
    if (start + VISIBLE_PAGE_BUTTON_COUNT - 1 > total) {
      start = total - VISIBLE_PAGE_BUTTON_COUNT + 1;
    }

    return Array.from({ length: VISIBLE_PAGE_BUTTON_COUNT }, (_, index) => start + index);
  });

  readonly showingFrom = computed(() => {
    if (this.totalRecords() === 0 || this.totalCount() === 0) {
      return 0;
    }
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly showingTo = computed(() => {
    if (this.totalRecords() === 0) {
      return 0;
    }
    return Math.min(this.currentPage() * this.pageSize(), this.totalCount());
  });

  constructor() {
    document.body.setAttribute('data-ks-data-explorer', 'true');
    this.destroyRef.onDestroy(() => {
      document.body.removeAttribute('data-ks-data-explorer');
      this.store.dispatch(DataExplorerCacheActions.resetAll());
    });

    this.filterReload$
      .pipe(debounceTime(400), takeUntilDestroyed())
      .subscribe(() => this.dispatchLoadRows(true));

    this.dataExplorerApi
      .getProducts()
      .pipe(
        catchError(() => of([] as DataExplorerProductDto[])),
        takeUntilDestroyed(),
      )
      .subscribe((options) => {
        this.productOptions.set(options);
        this.productsLoading.set(false);
        const first = options[0]?.value ?? '';
        if (!first) {
          return;
        }
        this.selectedProduct.set(first);
        this.store.dispatch(DataExplorerColumnsApiActions.loadColumns({ product: first }));
        this.refreshSavedQueries();
      });

    effect(() => {
      const products = this.dataProducts();
      if (products.length > 0 && this.expandedProducts().length === 0) {
        this.expandedProducts.set([products[0].id]);
      }
    });

    effect(() => {
      const pending = this.pendingSavedQuery();
      const loading = this.columnsLoading();
      if (!pending || loading) {
        return;
      }
      this.pendingSavedQuery.set(null);
      this.finishApplySavedQuery(pending);
    });
  }

  getRowKey = getRowKey;

  skeletonCellWidth(rowIndex: number, colIndex: number): string {
    const widths = ['42%', '68%', '55%', '78%', '36%', '62%', '48%', '72%'];
    return widths[(rowIndex + colIndex) % widths.length];
  }

  reloadColumns(): void {
    const product = this.selectedProduct();
    if (!product) {
      return;
    }
    this.store.dispatch(DataExplorerCacheActions.resetAll());
    this.store.dispatch(DataExplorerColumnsApiActions.loadColumns({ product }));
  }

  onProductChange(product: string, preserveEditing = false): void {
    if (!product || product === this.selectedProduct()) {
      return;
    }

    this.selectedProduct.set(product);
    this.clearQueryState(!preserveEditing);
    this.store.dispatch(DataExplorerCacheActions.resetAll());
    this.store.dispatch(DataExplorerColumnsApiActions.loadColumns({ product }));
    this.refreshSavedQueries();
  }

  private clearQueryState(clearEditing = true): void {
    if (clearEditing) {
      this.editingSavedQuery.set(null);
    }
    this.selectedFieldIds.set([]);
    this.filters.set([]);
    this.filterLogic.set('and');
    this.groupByFieldId.set(null);
    this.sortFieldId.set(null);
    this.sortDirection.set('asc');
    this.columnSearch.set('');
    this.expandedGroupKeys.set([]);
    this.expandedProducts.set([]);
    this.currentPage.set(1);
    this.store.dispatch(DataExplorerRowsApiActions.clearRows());
  }

  private scheduleFilterReload(): void {
    if (!this.hasQuery()) {
      return;
    }
    this.filterReload$.next();
  }

  private dispatchLoadRows(resetPage = false): void {
    const product = this.selectedProduct();
    const columns = this.selectedFieldIds();
    if (!product || columns.length === 0) {
      this.currentPage.set(1);
      this.store.dispatch(DataExplorerRowsApiActions.clearRows());
      return;
    }

    if (resetPage) {
      this.currentPage.set(1);
    }

    this.store.dispatch(
      DataExplorerRowsApiActions.loadRows({
        product,
        columns: [...columns],
        sortBy: this.sortFieldId() ?? '',
        sortDir: this.sortDirection(),
        groupByField: this.groupByFieldId() ?? '',
        filters: [...this.filters()],
        filterLogic: this.filterLogic(),
        page: this.currentPage(),
        pageSize: this.pageSize(),
      }),
    );
  }

  setPageSize(size: number): void {
    if (size === this.pageSize() || !this.pageSizeOptions.some((option) => option === size)) {
      return;
    }

    this.pageSize.set(size);
    this.currentPage.set(1);
    this.dispatchLoadRows();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }

    this.currentPage.set(page);
    this.dispatchLoadRows();
  }

  rowNumber(index: number): number {
    return (this.currentPage() - 1) * this.pageSize() + index + 1;
  }

  getTypeBadge = getTypeBadge;
  getTypeBadgeClass = getTypeBadgeClass;

  getProductIcon(productId: string): typeof Building2 {
    return this.productIcons[productId] ?? Building2;
  }

  appliedFilterLabel(): string {
    const count = this.appliedFilterCount();
    if (count === 1) {
      return '1 active filter';
    }
    if (count === 0) {
      return '0 active filter';
    }
    return `${count} active filters`;
  }

  getProductFieldIds(product: DataProduct): string[] {
    return product.fields.map((field) => field.id);
  }

  isProductFullySelected(product: DataProduct): boolean {
    const fieldIds = this.getProductFieldIds(product);
    return fieldIds.length > 0 && fieldIds.every((id) => this.isFieldSelected(id));
  }

  isProductPartiallySelected(product: DataProduct): boolean {
    const fieldIds = this.getProductFieldIds(product);
    const selectedCount = fieldIds.filter((id) => this.isFieldSelected(id)).length;
    return selectedCount > 0 && selectedCount < fieldIds.length;
  }

  formatValue(record: DataExplorerRow, field: DataProductField): string {
    const value = record[field.dataKey];
    return formatCellValue(value as string | number, field.type);
  }

  getNumericCellValue(record: DataExplorerRow, field: DataProductField): number | null {
    const value = record[field.dataKey];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  formatPercentCell(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  isFieldSelected(fieldId: string): boolean {
    return this.selectedFieldIds().includes(fieldId);
  }

  isProductExpanded(productId: string): boolean {
    return this.expandedProducts().includes(productId);
  }

  toggleProductExpanded(productId: string): void {
    this.expandedProducts.update((ids) =>
      ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId],
    );
  }

  private syncDerivedQueryState(selectedIds: string[]): void {
    if (!selectedIds.includes(this.groupByFieldId() ?? '')) {
      this.groupByFieldId.set(null);
    }
    if (!selectedIds.includes(this.sortFieldId() ?? '')) {
      this.sortFieldId.set(null);
    }
  }

  toggleProductFields(product: DataProduct, event: Event): void {
    event.stopPropagation();
    const fieldIds = this.getProductFieldIds(product);
    const allSelected = this.isProductFullySelected(product);

    this.selectedFieldIds.update((ids) => {
      const next = allSelected
        ? ids.filter((id) => !fieldIds.includes(id))
        : [...new Set([...ids, ...fieldIds])];

      this.syncDerivedQueryState(next);
      return next;
    });
    this.dispatchLoadRows(true);
  }

  toggleField(fieldId: string): void {
    this.selectedFieldIds.update((ids) => {
      const next = ids.includes(fieldId)
        ? ids.filter((id) => id !== fieldId)
        : [...ids, fieldId];

      this.syncDerivedQueryState(next);
      return next;
    });
    this.dispatchLoadRows(true);
  }

  toggleColumnsPanel(): void {
    this.isColumnsPanelOpen.update((open) => !open);
  }

  toggleFiltersPanel(): void {
    this.isFiltersPanelOpen.update((open) => !open);
  }

  toggleGroupByDropdown(): void {
    this.isGroupByOpen.update((open) => !open);
  }

  closeGroupByDropdown(): void {
    this.isGroupByOpen.set(false);
  }

  selectGroupBy(fieldId: string | null): void {
    this.groupByFieldId.set(fieldId);
    this.expandedGroupKeys.set([]);
    this.closeGroupByDropdown();
    this.dispatchLoadRows(true);
  }

  applyQuickStart(template: QuickStartTemplate): void {
    this.selectedFieldIds.set([...template.fieldIds]);
    this.groupByFieldId.set(null);
    this.filters.set([]);
    this.isColumnsPanelOpen.set(true);
    this.dispatchLoadRows(true);
  }

  addFilter(): void {
    const firstField = this.selectedFields()[0];
    this.filters.update((items) => [
      ...items,
      {
        id: generateFilterId(),
        fieldId: firstField?.id ?? '',
        operator: 'equals',
        value: '',
      },
    ]);
    this.isFiltersPanelOpen.set(true);
  }

  updateFilter(filterId: string, patch: Partial<QueryFilter>): void {
    this.filters.update((items) =>
      items.map((item) => (item.id === filterId ? { ...item, ...patch } : item)),
    );
    this.scheduleFilterReload();
  }

  updateFilterOperator(filterId: string, operator: string): void {
    this.updateFilter(filterId, { operator: operator as FilterOperator });
  }

  removeFilter(filterId: string): void {
    this.filters.update((items) => items.filter((item) => item.id !== filterId));
    if (this.filters().length <= 1) {
      this.filterLogic.set('and');
    }
    this.scheduleFilterReload();
  }

  clearFilters(): void {
    this.filters.set([]);
    this.filterLogic.set('and');
    this.scheduleFilterReload();
  }

  setFilterLogic(logic: FilterLogic): void {
    this.filterLogic.set(logic);
    this.scheduleFilterReload();
  }

  toggleGroupExpanded(groupKey: string): void {
    this.expandedGroupKeys.update((keys) => {
      const allGroupKeys = this.tableGroups()
        .filter((g) => g.key !== '__flat__')
        .map((g) => g.key);

      if (keys.length === 0) {
        return allGroupKeys.filter((key) => key !== groupKey);
      }

      return keys.includes(groupKey)
        ? keys.filter((key) => key !== groupKey)
        : [...keys, groupKey];
    });
  }

  toggleSort(fieldId: string): void {
    if (this.sortFieldId() === fieldId) {
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortFieldId.set(fieldId);
      this.sortDirection.set('asc');
    }
    this.dispatchLoadRows(true);
  }

  resetQuery(): void {
    this.editingSavedQuery.set(null);
    this.selectedFieldIds.set([]);
    this.filters.set([]);
    this.filterLogic.set('and');
    this.groupByFieldId.set(null);
    this.sortFieldId.set(null);
    this.sortDirection.set('asc');
    this.columnSearch.set('');
    this.expandedGroupKeys.set([]);
    this.dispatchLoadRows(true);
  }

  openSaveModal(): void {
    this.saveModalMode.set(this.isEditingSavedQuery() ? 'update' : 'create');
    this.isSaveModalOpen.set(true);
  }

  closeSaveModal(): void {
    if (this.savedQueryActionLoading()) {
      return;
    }
    this.isSaveModalOpen.set(false);
  }

  openSavedModal(): void {
    this.refreshSavedQueries();
    this.isSavedModalOpen.set(true);
  }

  closeSavedModal(): void {
    if (this.savedQueryActionLoading()) {
      return;
    }
    this.isSavedModalOpen.set(false);
  }

  onSaveModalSubmit(payload: SaveQueryPayload): void {
    if (this.saveModalMode() === 'update') {
      this.onUpdateQuery(payload);
      return;
    }
    this.onSaveQuery(payload);
  }

  onUpdateQuery(payload: SaveQueryPayload): void {
    const editing = this.editingSavedQuery();
    if (editing == null || !this.hasQuery()) {
      return;
    }

    this.savedQueryActionLoading.set(true);
    this.dataExplorerService
      .updateQuery(
        editing.id,
        payload,
        {
          selectedFieldIds: [...this.selectedFieldIds()],
          filters: [...this.filters()],
          filterLogic: this.filterLogic(),
          groupByFieldId: this.groupByFieldId(),
          product: this.selectedProduct(),
        },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savedQueryActionLoading.set(false);
          this.editingSavedQuery.set(null);
          this.refreshSavedQueries();
          this.closeSaveModal();
        },
        error: () => {
          this.savedQueryActionLoading.set(false);
        },
      });
  }

  onSaveQuery(payload: SaveQueryPayload): void {
    this.savedQueryActionLoading.set(true);
    this.dataExplorerService
      .saveQuery(payload, {
        selectedFieldIds: [...this.selectedFieldIds()],
        filters: [...this.filters()],
        filterLogic: this.filterLogic(),
        groupByFieldId: this.groupByFieldId(),
        product: this.selectedProduct(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savedQueryActionLoading.set(false);
          this.refreshSavedQueries();
          this.closeSaveModal();
        },
        error: () => {
          this.savedQueryActionLoading.set(false);
        },
      });
  }

  loadSavedQuery(query: SavedQuery): void {
    this.editingSavedQuery.set(null);
    this.loadingSavedQuery.set({ id: query.id, name: query.name, mode: 'run' });
    this.savedQueryActionLoading.set(true);
    this.dataExplorerService
      .getQuery(query.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullQuery) => {
          this.savedQueryActionLoading.set(false);
          this.loadingSavedQuery.set(null);
          this.queueApplySavedQuery(fullQuery);
          this.closeSavedModal();
        },
        error: () => {
          this.savedQueryActionLoading.set(false);
          this.loadingSavedQuery.set(null);
        },
      });
  }

  editSavedQuery(query: SavedQuery): void {
    this.loadingSavedQuery.set({ id: query.id, name: query.name, mode: 'edit' });
    this.savedQueryActionLoading.set(true);
    this.dataExplorerService
      .getQuery(query.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullQuery) => {
          this.savedQueryActionLoading.set(false);
          this.loadingSavedQuery.set(null);
          this.queueApplySavedQuery(fullQuery);
          this.editingSavedQuery.set({
            id: fullQuery.id,
            name: fullQuery.name,
            description: fullQuery.description,
          });
          this.closeSavedModal();
        },
        error: () => {
          this.savedQueryActionLoading.set(false);
          this.loadingSavedQuery.set(null);
        },
      });
  }

  private queueApplySavedQuery(query: SavedQuery): void {
    const product = query.product?.trim() || this.selectedProduct();
    if (product && product !== this.selectedProduct()) {
      this.pendingSavedQuery.set(query);
      this.onProductChange(product, true);
      return;
    }
    this.finishApplySavedQuery(query);
  }

  private finishApplySavedQuery(query: SavedQuery): void {
    const availableFieldIds = new Set(this.allFields().map((field) => field.id));
    const selectedFieldIds = query.selectedFieldIds.filter((id) => availableFieldIds.has(id));
    const filters = query.filters
      .filter((filter) => availableFieldIds.has(filter.fieldId))
      .map((filter) => ({ ...filter }));

    this.selectedFieldIds.set(selectedFieldIds);
    this.filters.set(filters);
    this.filterLogic.set(query.filterLogic);
    this.groupByFieldId.set(
      query.groupByFieldId && availableFieldIds.has(query.groupByFieldId)
        ? query.groupByFieldId
        : null,
    );
    this.sortFieldId.set(null);
    this.sortDirection.set('asc');
    this.expandedGroupKeys.set([]);
    this.isColumnsPanelOpen.set(true);
    this.dispatchLoadRows(true);
  }

  onDeleteSavedQuery(query: SavedQuery): void {
    this.savedQueryActionLoading.set(true);
    this.dataExplorerService
      .deleteQuery(query.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savedQueryActionLoading.set(false);
          if (this.editingSavedQuery()?.id === query.id) {
            this.editingSavedQuery.set(null);
          }
          this.refreshSavedQueries();
        },
        error: () => {
          this.savedQueryActionLoading.set(false);
        },
      });
  }

  private refreshSavedQueries(): void {
    const product = this.selectedProduct();
    if (!product) {
      this.savedQueries.set([]);
      return;
    }

    this.savedQueriesLoading.set(true);
    this.savedQueriesError.set(null);
    this.dataExplorerService
      .getSavedQueries(product)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (queries) => {
          this.savedQueries.set(queries);
          this.savedQueriesLoading.set(false);
        },
        error: (error: Error) => {
          this.savedQueries.set([]);
          this.savedQueriesLoading.set(false);
          this.savedQueriesError.set(error.message);
        },
      });
  }

  exportData(): void {
    const columns = this.selectedFields();
    const rows = this.sortedRecords();

    if (!columns.length || !rows.length) {
      return;
    }

    this.excelService.export<DataExplorerRow>({
      filename: `data-explorer-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Data Explorer',
      title: 'Data Explorer',
      columns: columns.map((field) => ({
        header: field.label,
        value: (row: DataExplorerRow) => this.formatValue(row, field),
      })),
      rows,
    });
  }
}
